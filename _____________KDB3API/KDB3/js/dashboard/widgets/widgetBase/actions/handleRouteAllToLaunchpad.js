define(["../effects/discoverCanvasWidgets.js", "../effects/waitForTransferReady.js", "./handleRouteToLaunchpad.js", "./normalizeDispatchResult.js"], function (_discoverCanvasWidgets, _waitForTransferReady, _handleRouteToLaunchpad, _normalizeDispatchResult) {
  function handleRouteAllToLaunchpad(_context, _action) {
    const payload = (_action && _action.payload) || {};
    if (!_context.isLaunchpadReady()) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_LAUNCHPAD_NOT_READY" }));
    }
    return _waitForTransferReady.waitForCanvasTransferReady(_context._KDB).then(function () {
      return _discoverCanvasWidgets(_context._KDB, { tabId: payload.tabId || null });
    }).then(function (descriptors) {
      const results = { ok: true, routed: 0, skipped: 0, failed: 0, missingShells: 0, firstErrorCode: null };
      return routeSequentially(_context, descriptors, payload, results, 0).then(function () {
        const normalized = results.failed > 0 ? _normalizeDispatchResult({
          ok: false,
          errorCode: results.firstErrorCode || "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED",
          routed: results.routed,
          skipped: results.skipped,
          failed: results.failed
        }) : _normalizeDispatchResult(results);
        // Shells the canvas model knows but the DOM does not (lazy render
        // race) must keep the tab retryable in handleEnsureTabWidgetsRouted.
        normalized.missingShells = results.missingShells;
        return normalized;
      });
    });
  }
  function routeSequentially(context, descriptors, payload, results, index) {
    if (index >= descriptors.length) {
      return Promise.resolve();
    }
    return processDescriptor(context, descriptors[index], payload).then(function (entry) {
      if (entry && entry.skipped) {
        results.skipped += 1;
        if (entry.reasonCode === "WIDGET_BASE_WIDGET_ID_MISSING") {
          results.missingShells += 1;
        }
      } else if (entry && entry.ok) {
        results.routed += 1;
      } else {
        results.failed += 1;
        if (!results.firstErrorCode && entry && entry.errorCode) {
          results.firstErrorCode = entry.errorCode;
        }
      }
      return routeSequentially(context, descriptors, payload, results, index + 1);
    });
  }
  function processDescriptor(context, descriptor, payload) {
    if (descriptor.skipReason) {
      return Promise.resolve({ ok: true, skipped: true, reasonCode: descriptor.skipReason });
    }
    return _handleRouteToLaunchpad(context, {
      type: context.actionTypes.ROUTE_TO_LAUNCHPAD,
      widgetId: descriptor.widgetId,
      payload: {
        reason: payload.reason || "startup",
        sourceModule: "widgetBase",
        tabId: descriptor.tabId,
        widgetType: descriptor.widgetType,
        visualType: descriptor.visualType,
        visualTitle: descriptor.visualTitle,
        isLiveWidget: descriptor.isLiveWidget === true,
        isTextWidget: descriptor.isTextWidget === true,
        isHistoryReplay: false
      }
    });
  }
  return handleRouteAllToLaunchpad;
});
