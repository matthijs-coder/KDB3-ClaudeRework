define([
  "../view/placeWidgetOnCanvas.js",
  "../effects/applyWidgetLayout.js",
  "../effects/commitWidgetBaseHistory.js",
  "../effects/dispatchWidgetVisLifecycle.js",
  "../state/normalizeWidgetLayout.js",
  "../history/resolveCanvasLayoutFromFrame.js",
  "./normalizeDispatchResult.js"
], function (_placeWidgetOnCanvas, _applyWidgetLayout, _commitWidgetBaseHistory, _dispatchWidgetVisLifecycle, _normalizeWidgetLayout, _layoutFrame, _normalizeDispatchResult) {
  function handleTakeFromLaunchpad(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    const opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    if (!widgetId) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING" }));
    }
    const layout = _layoutFrame.hasLayout(payload.targetLayout)
      ? _normalizeWidgetLayout(payload.targetLayout)
      : _normalizeWidgetLayout(_layoutFrame.resolveCanvasLayoutFromFrame(_context.selectors.readFrame(_context._KDB, widgetId)));
    const dropboxId = resolveTakeDropboxId(_context._KDB, payload, widgetId);
    const placeResult = _placeWidgetOnCanvas(_context._KDB, { widgetId: widgetId, layout: layout, dropboxId: dropboxId, fallbackDropboxId: resolveTakeFallbackDropboxId(payload, dropboxId) });
    if (placeResult.ok !== true) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: placeResult.errorCode, errorMessage: placeResult.errorMessage }));
    }
    return _applyWidgetLayout(_context._KDB, widgetId, layout).then(function (layoutResult) {
      if (layoutResult.ok !== true) {
        return _normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: layoutResult.errorCode, errorMessage: layoutResult.errorMessage });
      }
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return _normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq });
      }
      var succeededPayload = { layout: layout };
      if (typeof payload.tabId === "string" && payload.tabId !== "") {
        succeededPayload.tabId = payload.tabId;
      }
      _context.dispatchInternal({ type: _context.actionTypes.PLACE_ON_CANVAS_SUCCEEDED, widgetId: widgetId, payload: succeededPayload });
      maybeCommitTakeHistory(_context, payload, widgetId);
      _dispatchWidgetVisLifecycle.dispatchWidgetVisEnsureObservers(_context._KDB, { widgetId: widgetId, reason: payload.reason || null });
      return _normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, placement: "onCanvas" });
    });
  }
  function resolveTakeDropboxId(_KDB, payload, widgetId) {
    if (typeof payload.dropboxId === "string" && payload.dropboxId !== "") {
      return payload.dropboxId;
    }
    const tabId = payload.tabId;
    if (typeof tabId !== "string" || tabId === "") {
      return tabId;
    }
    try {
      const state = _KDB.api && _KDB.api.tabs && typeof _KDB.api.tabs.getState === "function" ? _KDB.api.tabs.getState() : null;
      const tabTargets = state && state.tabTargets ? state.tabTargets : {};
      const tabTargetKeys = Object.keys(tabTargets);
      for (let keyIndex = 0; keyIndex < tabTargetKeys.length; keyIndex += 1) {
        const t = tabTargets[tabTargetKeys[keyIndex]];
        if (t && t.tabId === tabId && typeof t.pageId === "string" && t.pageId !== "" && t.pageId !== t.tabId) {
          return t.pageId;
        }
        if (t && t.pageId === tabId && t.pageId !== t.tabId) {
          return tabId;
        }
      }
      console.warn("[widgetBase.takeFromLaunchpad] no distinct page for tab; placing in tab container", { widgetId: widgetId, tabId: tabId });
      return tabId;
    } catch (err) {
      console.error("[widgetBase.takeFromLaunchpad] page resolve failed", { widgetId: widgetId, tabId: tabId }, err);
      return tabId;
    }
  }
  function resolveTakeFallbackDropboxId(payload, dropboxId) {
    if (typeof payload.dropboxId !== "string" || payload.dropboxId === "") {
      if (typeof payload.tabId === "string" && payload.tabId !== "") {
        if (dropboxId !== payload.tabId) {
          return payload.tabId;
        }
      }
    }
    return null;
  }
  function maybeCommitTakeHistory(context, payload, widgetId) {
    if (payload.isHistoryReplay === true || payload.reason === "drop" || payload.reason === "historyReplay" || payload.reason === "restore") {
      return;
    }
    if (payload.reason === "user") {
      _commitWidgetBaseHistory(context._KDB, { key: "widget_launchpadTransfer", timestamp: Date.now(), old: { widgetId: widgetId, placement: "inLaunchpad" }, new: { widgetId: widgetId, placement: "onCanvas" } });
    }
  }
  return handleTakeFromLaunchpad;
});
