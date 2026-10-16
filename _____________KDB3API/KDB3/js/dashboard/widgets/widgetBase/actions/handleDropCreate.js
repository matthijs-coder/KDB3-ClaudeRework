define([
  "../state/resolveLaunchpadRoute.js",
  "../../../launchpad/state/selectors.js",
  "../view/placeWidgetOnCanvas.js",
  "../effects/applyWidgetLayout.js",
  "../view/resolveWidgetShell.js",
  "../effects/dispatchContentCreate.js",
  "../effects/dispatchWidgetSettingsPlaceControls.js",
  "../effects/dispatchWidgetSettingsCleanup.js",
  "../effects/commitWidgetBaseHistory.js",
  "./rollbackWidgetBaseOperation.js",
  "./normalizeDispatchResult.js",
  "./resolveDropClaim.js",
  "./buildDropHistoryFrames.js"
], function (_resolveLaunchpadRoute, _launchpadSelectors, _placeWidgetOnCanvas, _applyWidgetLayout, _shellModule, _dispatchContentCreate, _dispatchWidgetSettingsPlaceControls, _dispatchWidgetSettingsCleanup, _commitWidgetBaseHistory, _rollbackWidgetBaseOperation, _normalizeDispatchResult, _resolveDropClaim, _dropHistoryFrames) {
  function handleDropCreate(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const dropRequest = payload.dropRequest || {};
    if (_action.widgetId && payload.widgetId && _action.widgetId !== payload.widgetId) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_CONFLICT" }));
    }
    return _resolveDropClaim(_context, dropRequest).then(function (claim) {
      if (claim.ok !== true) {
        return _normalizeDispatchResult(claim);
      }
      return runDropWorkflow(_context, _action, dropRequest, claim);
    });
  }

  function runDropWorkflow(context, action, dropRequest, claim) {
    const widgetId = claim.widgetId;
    const opSeq = context.ensureOpSeq(widgetId, action.opSeq);
    const route = _resolveLaunchpadRoute(buildDropDescriptor(context, dropRequest, widgetId));
    if (route.shouldRoute === false) {
      return Promise.resolve(_normalizeDispatchResult({ ok: true, skipped: true, widgetId: widgetId, reasonCode: route.reasonCode }));
    }
    const previousFrame = context.selectors.readFrame(context._KDB, widgetId);
    context.dispatchInternal({ type: context.actionTypes.REGISTER_FRAME, payload: { widgetId: widgetId, frame: { kind: route.kind, role: route.role, tabId: route.tabId, tabHandle: route.tabHandle, lifecycle: "loading" } } });
    context.dispatchInternal({ type: context.actionTypes.MARK_PENDING, widgetId: widgetId, payload: { kind: "dropCreate", opSeq: opSeq, lifecycle: "loading" } });
    const placeResult = _placeWidgetOnCanvas(context._KDB, { widgetId: widgetId, shellEl: claim.shellEl, dropboxId: dropRequest.dropboxId, dropLayout: dropRequest.layout, draggedElementType: dropRequest.draggedElementType });
    if (placeResult.ok !== true) {
      return rollbackDrop(context, widgetId, claim, route, previousFrame, placeResult.errorCode);
    }
    return _applyWidgetLayout(context._KDB, widgetId, placeResult.layout).then(function (layoutResult) {
      if (layoutResult.ok !== true) {
        return rollbackDrop(context, widgetId, claim, route, previousFrame, layoutResult.errorCode);
      }
      if (route.kind === "other" || route.kind === "topN") {
        return finalizeDrop(context, action, dropRequest, widgetId, opSeq, route, placeResult.layout, previousFrame, claim);
      }
      return _dispatchContentCreate(context._KDB, { kind: route.kind, widgetId: widgetId, payload: { dropRequest: dropRequest, payload: dropRequest.payload || {}, sourceKind: dropRequest.sourceKind || "unknown" } }).then(function (contentResult) {
        if (contentResult.ok !== true) {
          return rollbackDrop(context, widgetId, claim, route, previousFrame, contentResult.errorCode);
        }
        return finalizeDrop(context, action, dropRequest, widgetId, opSeq, route, placeResult.layout, previousFrame, claim).then(function (dropResult) {
          startWidgetSettingsAfterContentCreate(context, widgetId, route, claim, placeResult.layout, dropRequest, dropResult);
          return dropResult;
        });
      });
    });
  }

  function startWidgetSettingsAfterContentCreate(context, widgetId, route, claim, layout, dropRequest, dropResult) {
    if (!dropResult || dropResult.ok !== true || (route.kind !== "text" && route.kind !== "vis")) {
      return;
    }
    _dispatchWidgetSettingsPlaceControls(context._KDB, {
      widgetId: widgetId,
      kind: route.kind,
      shellEl: claim.shellEl,
      layout: layout,
      dropRequest: dropRequest
    });
  }

  function finalizeDrop(context, action, dropRequest, widgetId, opSeq, route, layout, previousFrame, claim) {
    if (context.isStaleOpSeq(widgetId, opSeq)) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq }));
    }
    const succeededPayload = { layout: layout };
    if (route.tabId != null && String(route.tabId) !== "") {
      succeededPayload.tabId = String(route.tabId);
    }
    context.dispatchInternal({ type: context.actionTypes.PLACE_ON_CANVAS_SUCCEEDED, widgetId: widgetId, payload: succeededPayload });
    if (((action && action.payload) || {}).isHistoryReplay !== true) {
      _commitWidgetBaseHistory(context._KDB, { key: "widget_canvasDrop", timestamp: Date.now(), old: _dropHistoryFrames.buildHistoryFrame(previousFrame), new: _dropHistoryFrames.buildDropHistoryFrame(widgetId, route, layout, dropRequest) });
    }
    _dropHistoryFrames.storeWidgetRuntime(context._KDB, widgetId, claim.shellEl, opSeq);
    return Promise.resolve(_normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, placement: "onCanvas" }));
  }

  function rollbackDrop(context, widgetId, claim, route, previousFrame, errorCode) {
    if (route.kind === "text" || route.kind === "vis") {
      _dispatchWidgetSettingsCleanup(context._KDB, { widgetId: widgetId });
    }
    const slotMeta = _launchpadSelectors.readLaunchpadSlotMeta(context._KDB, route.launchpadPad, route.tabId);
    return _rollbackWidgetBaseOperation(context, { widgetId: widgetId, shellEl: claim.shellEl, slotMeta: slotMeta, launchpadPad: route.launchpadPad, launchpadSlotKey: slotMeta ? slotMeta.slotKey : null, lastCanvasLayout: previousFrame ? previousFrame.lastCanvasLayout : null, previousFrame: previousFrame, errorCode: errorCode || "WIDGET_BASE_DROP_FAILED" });
  }

  function buildDropDescriptor(context, dropRequest, widgetId) {
    const payload = dropRequest.payload || {};
    return {
      widgetId: widgetId,
      draggedElementType: dropRequest.draggedElementType,
      sourceKind: dropRequest.sourceKind || null,
      visualType: payload.visualType || payload.visType || payload.visualizationType || null,
      visualTitle: payload.visualTitle || payload.title || payload.visualName || payload.name || payload.display || payload.langtext || null,
      widgetType: dropRequest.draggedElementType === "text" || dropRequest.sourceKind === "toolboxTextButton" ? "WIDGET.TEXT" : null,
      tabId: dropRequest.tabId,
      tabHandle: 0,
      isHostWidget: _shellModule.isHostWidget(context._KDB, widgetId)
    };
  }

  return handleDropCreate;
});
