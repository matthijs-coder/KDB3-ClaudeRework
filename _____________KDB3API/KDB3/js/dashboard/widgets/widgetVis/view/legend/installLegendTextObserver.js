define([
  "./disconnectLegendTextObserver.js",
  "./observeLegendCaptionRoots.js"
], function (
  _disconnectLegendTextObserver,
  _observeLegendCaptionRoots
) {
  "use strict";

  var QUERY_ROOT_OBSERVE_LABEL = "queryRoot";
  var SHELL_OBSERVE_LABEL = "shell";

  function readObserveRootLabel(_context) {
    return _context && _context.isShell === true ? SHELL_OBSERVE_LABEL : QUERY_ROOT_OBSERVE_LABEL;
  }

  function buildLegendTextObserverLog(_context, _observeRootSelector) {
    var widgetId = _context.widgetId;
    var opSeq = _context.opSeq;
    return {
      timestamp: Date.now(),
      widgetId: widgetId != null ? widgetId : null,
      opSeq: opSeq != null ? opSeq : null,
      observeRootSelector: _observeRootSelector,
      observeRoot: readObserveRootLabel(_context),
      storagePath:
        widgetId != null
          ? "_KDB.runtime.widgetVis.byId[" + widgetId + "].observers.legendText"
          : null,
      action: "skipped"
    };
  }

  function resolveInstallSkipReason(_queryRoot, _context) {
    var runtime = _context.runtime;
    var isStaleOpSeq = _context.isStaleOpSeq;
    if (_context.reason === "cleanup" || _context.forceEmpty === true) {
      return "cleanup";
    }
    if (!runtime || !_queryRoot) {
      return _context.skipReason || "no_query_root";
    }
    if (typeof isStaleOpSeq === "function" && isStaleOpSeq(_context.widgetId, _context.opSeq)) {
      return "stale_op_seq";
    }
    if (typeof MutationObserver !== "function") {
      return "mutation_observer_unavailable";
    }
    return null;
  }

  function installLegendTextObserver(_queryRoot, _context) {
    var context = _context || {};
    var runtime = context.runtime;
    var observeRootLabel = readObserveRootLabel(context);
    var observerLog = buildLegendTextObserverLog(context, observeRootLabel);
    try {
      var skipReason = resolveInstallSkipReason(_queryRoot, context);
      if (skipReason) {
        observerLog.reason = skipReason;
        return observerLog;
      }

      var disconnectResult = _disconnectLegendTextObserver(runtime);
      if (disconnectResult.disconnected) {
        observerLog.previousObserverDisconnected = true;
      }

      runtime.observers = runtime.observers || {};
      var observerDeps = {
        runtime: runtime,
        widgetId: context.widgetId,
        opSeq: context.opSeq,
        isStaleOpSeq: context.isStaleOpSeq,
        queryRoot: _queryRoot,
        context: context
      };
      runtime.observers.legendText = _observeLegendCaptionRoots(_queryRoot, observerDeps);
      observerLog.action = "installed";
      observerLog.observeRoot = observeRootLabel;
      return observerLog;
    } catch (err) {
      console.error("[widgetVis.installLegendTextObserver] failed", err);
      throw err;
    }
  }

  installLegendTextObserver.disconnectLegendTextObserver = _disconnectLegendTextObserver;

  return installLegendTextObserver;
});
