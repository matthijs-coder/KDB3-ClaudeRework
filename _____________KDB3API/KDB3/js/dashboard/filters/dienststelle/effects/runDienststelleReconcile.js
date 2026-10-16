define([
  "../state/selectors.js",
  "./scheduleDienststelleViewSync.js"
], function (_selectors, _scheduleDienststelleViewSync) {
  "use strict";

  function readActiveSichtValue(_KDB, _context) {
    if (_context && _context.activeSichtValue != null) {
      return String(_context.activeSichtValue);
    }
    var ctx = _selectors.readActiveDienststelleContext(_KDB);
    if (ctx && ctx.activeSichtValue) {
      return String(ctx.activeSichtValue);
    }
    var sichtApi = _KDB && _KDB.api ? _KDB.api.sicht : null;
    var sichtState;
    if (sichtApi && typeof sichtApi.getState === "function") {
      sichtState = sichtApi.getState();
      if (sichtState && sichtState.activeSichtValue) {
        return String(sichtState.activeSichtValue);
      }
    }
    return null;
  }

  function runDienststelleReconcile(_KDB, _dispatchInternal, _reconcile, _context) {
    var context = _context || {};
    var activeSichtValue = readActiveSichtValue(_KDB, context);
    if (!activeSichtValue) {
      return Promise.resolve(null);
    }
    return _reconcile(_KDB, _dispatchInternal, {
      activeSichtValue: activeSichtValue,
      source: context.source || "sync",
      isHistoryReplay: context.isHistoryReplay === true,
      commitFromUser: context.commitFromUser === true,
      commitSourceScope: context.commitSourceScope,
      commitSourceWasClear: context.commitSourceWasClear,
      allowDefaulting: context.allowDefaulting === true,
      filterScope: context.filterScope,
      scopeId: context.scopeId,
      viewSyncHandoff: context.viewSyncHandoff,
      observedAt: context.observedAt
    }).then(function (_reconcileResult) {
      _scheduleDienststelleViewSync(_KDB, context, _reconcileResult);
      return _reconcileResult;
    });
  }

  return runDienststelleReconcile;
});
