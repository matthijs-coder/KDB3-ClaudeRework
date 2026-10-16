define([
  "../state/resolveLaunchpadRoute.js",
  "../../../launchpad/state/selectors.js",
  "../view/moveWidgetToLaunchpad.js",
  "../view/resolveWidgetShell.js",
  "../effects/commitWidgetBaseHistory.js",
  "../effects/cleanWidgetForTransfer.js",
  "../effects/waitForTransferReady.js",
  "../history/resolveCanvasLayoutFromFrame.js",
  "../history/buildTransferHistoryFrames.js",
  "./normalizeDispatchResult.js"
], function (_resolveLaunchpadRoute, _launchpadSelectors, _moveWidgetToLaunchpad, _shellModule, _commitWidgetBaseHistory, _cleanTransferModule, _waitForTransferReady, _layoutFrame, _historyFrames, _normalizeDispatchResult) {
  const _cleanWidgetForTransfer = _cleanTransferModule.cleanWidgetForTransfer;
  function handleRouteToLaunchpad(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId || payload.widgetId;
    const opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    if (!widgetId) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING" }));
    }
    if (_context.isLaunchpadReady() !== true) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_NOT_READY" }));
    }
    const descriptor = buildDescriptor(_context, widgetId, payload);
    const route = payload.targetPad ? buildExplicitRoute(payload, descriptor) : _resolveLaunchpadRoute(descriptor);
    if (route.shouldRoute === false) {
      return Promise.resolve(_normalizeDispatchResult({ ok: true, skipped: true, widgetId: widgetId, reasonCode: route.reasonCode || "WIDGET_BASE_WIDGET_SKIPPED" }));
    }
    if (!route.tabId || !route.launchpadPad) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_TAB_UNRESOLVED" }));
    }
    const slotMeta = _launchpadSelectors.readLaunchpadSlotMeta(_context._KDB, route.launchpadPad, route.tabId);
    if (!slotMeta) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_TARGET_MISSING" }));
    }
    const preTransferFrame = _context.selectors.readFrame(_context._KDB, widgetId);
    _context.dispatchInternal({ type: _context.actionTypes.REGISTER_FRAME, payload: { widgetId: widgetId, frame: buildFramePatch(route, slotMeta) } });
    return _waitForTransferReady.waitForWidgetTransferReady(_context._KDB, widgetId).then(function () {
      const readyShellEl = _shellModule.resolveWidgetShell(_context._KDB, widgetId);
      if (!readyShellEl) {
        return _normalizeDispatchResult({ ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING" });
      }
      const historySourceFrame = _layoutFrame.mergeDomLayoutIntoFrame(_context._KDB, preTransferFrame, readyShellEl);
      return cleanBeforeTransfer(_context._KDB, descriptor, route, readyShellEl).then(function () {
        const moveResult = _moveWidgetToLaunchpad(_context._KDB, {
          widgetId: widgetId,
          shellEl: readyShellEl,
          slotMeta: slotMeta
        });
        if (moveResult.ok !== true) {
          return _normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: moveResult.errorCode, errorMessage: moveResult.errorMessage });
        }
        if (_context.isStaleOpSeq(widgetId, opSeq)) {
          return _normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq });
        }
        _context.dispatchInternal({ type: _context.actionTypes.ROUTE_TO_LAUNCHPAD_SUCCEEDED, widgetId: widgetId, payload: { launchpadPad: route.launchpadPad, launchpadSlotKey: slotMeta.slotKey, lastCanvasLayout: _layoutFrame.resolveCanvasLayoutFromFrame(historySourceFrame) } });
        maybeCommitTransferHistory(_context, payload, widgetId, historySourceFrame, route, slotMeta);
        return _normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, placement: "inLaunchpad" });
      });
    }).catch(function (err) {
      console.error("[widgetBase.routeToLaunchpad] transfer failed", { widgetId: widgetId, error: err });
      return _normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", errorMessage: "Pre-transfer cleanup failed." });
    });
  }
  function cleanBeforeTransfer(_KDB, descriptor, route, shellEl) {
    const padKey = route && route.launchpadPad ? route.launchpadPad : null;
    if (shouldCleanTextForPad(descriptor, padKey) || shouldCleanLiveForPad(padKey)) {
      return _cleanWidgetForTransfer(_KDB, shellEl);
    }
    _cleanTransferModule.disposeWidgetVisForTransfer(_KDB, descriptor.widgetId);
    return Promise.resolve();
  }
  function shouldCleanLiveForPad(padKey) {
    return padKey === "visualization" || padKey === "topN";
  }
  function shouldCleanTextForPad(descriptor, padKey) {
    return padKey === "text" && (descriptor.isTextWidget === true || descriptor.widgetType === "WIDGET.TEXT" || descriptor.kind === "text");
  }
  function buildDescriptor(context, widgetId, payload) {
    const frame = context.selectors.readFrame(context._KDB, widgetId);
    return {
      widgetId: widgetId,
      // Frame-kind meegeven zodat routes zonder payload-metadata (tab-delete/
      // move/slot-moves) een vis-frame als vis herkennen i.p.v. de
      // "other"-fallback die het frame-kind overschrijft en de clean/dispose
      // overslaat (E0a-bevinding 2026-08-20).
      kind: payload.kind || (frame && frame.kind ? frame.kind : null),
      widgetType: payload.widgetType || (frame && frame.kind === "text" ? "WIDGET.TEXT" : null),
      visualType: payload.visualType || payload.visType || payload.visualizationType || null,
      visualTitle: payload.visualTitle || payload.title || payload.visualName || payload.name || null,
      tabId: (frame && frame.tabId) || payload.tabId || null,
      tabHandle: frame && frame.tabHandle != null ? frame.tabHandle : 0,
      isStartupDiscovery: payload.reason === "startup",
      isTopNHelperClaim: payload.isTopNHelperClaim === true,
      isHistoryReplay: payload.isHistoryReplay === true,
      isLiveWidget: payload.isLiveWidget === true,
      isTextWidget: payload.isTextWidget === true,
      isHostWidget: _shellModule.isHostWidget(context._KDB, widgetId)
    };
  }
  function buildExplicitRoute(payload, descriptor) {
    return { shouldRoute: true, reasonCode: null, kind: descriptor.kind || null, role: descriptor.role || "primary", launchpadPad: payload.targetPad, tabId: payload.tabId || descriptor.tabId, tabHandle: descriptor.tabHandle || 0 };
  }
  function buildFramePatch(route, slotMeta) {
    return { kind: route.kind, role: route.role, tabId: route.tabId, tabHandle: route.tabHandle, launchpadPad: route.launchpadPad, launchpadSlotKey: slotMeta.slotKey, lifecycle: "ready" };
  }
  function maybeCommitTransferHistory(context, payload, widgetId, frame, route, slotMeta) {
    const reason = payload.reason;
    if (payload.isHistoryReplay === true || reason === "startup" || reason === "rollback" || reason === "historyReplay") {
      return;
    }
    if (reason === "user" || reason === "contentRequest") {
      try {
        _commitWidgetBaseHistory(context._KDB, {
          key: "widget_launchpadTransfer",
          timestamp: Date.now(),
          old: _historyFrames.buildTransferHistoryOldFrame(widgetId, frame, payload),
          new: _historyFrames.buildTransferHistoryNewFrame(widgetId, frame, route, slotMeta, payload)
        });
      } catch (err) {
        console.error("[widgetBase.routeToLaunchpad] history commit failed", { widgetId: widgetId, error: err });
      }
    }
  }
  return handleRouteToLaunchpad;
});
