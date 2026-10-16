define([
  "../../effects/reconcileConfirmedDienststelle.js",
  "../../effects/ensureDienststelleRuntime.js",
  "../../state/selectors.js",
  "../../effects/runDienststelleReconcile.js"
], function (_reconcile, _ensureRuntime, _selectors, _runReconcile) {
  "use strict";

  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";

  function reconcile(_controller, _dispatchInternal, _context) {
    return _runReconcile(_controller._KDB, _dispatchInternal, _reconcile, _context || {});
  }

  function readActiveSichtValue(_controller) {
    var state = _selectors.readActiveDienststelleContext(_controller._KDB);
    return state && state.activeSichtValue ? String(state.activeSichtValue) : null;
  }

  function readActiveFilterKey(_controller) {
    var state = _selectors.readActiveDienststelleContext(_controller._KDB);
    return state && state.activeFilterKey ? String(state.activeFilterKey) : null;
  }

  function guardRun(_controller, _payload) {
    var runId = _payload && _payload.runId;
    var runtime;
    if (typeof runId !== "number" || !isFinite(runId)) {
      return {
        ok: false,
        diagnostics: [{ code: CANCELLED, message: "dienststelle parameterSet action requires a numeric runId" }]
      };
    }
    _controller.runtime = _controller.runtime || _ensureRuntime(_controller._KDB);
    runtime = _controller.runtime;
    if (typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId) {
      return {
        ok: false,
        diagnostics: [{
          code: CANCELLED,
          message: "stale parameterSet runId " + runId + " superseded by " + runtime.parameterSetRunId
        }]
      };
    }
    runtime.parameterSetRunId = runId;
    return null;
  }

  function isStale(_controller, _runId) {
    var runtime = _controller.runtime;
    return !!(runtime && typeof runtime.parameterSetRunId === "number" && _runId < runtime.parameterSetRunId);
  }

  // Extracted from createDienststelleController so the facet can be injected
  // without pushing that file past the 150-line limit. Mirrors the equivalent
  // file in nativeMultiSelect.
  function __controller(_controller, _dispatch, _dispatchInternal) {
    return {
      _KDB: _controller._KDB,
      filtersFacet: _controller.filtersFacet,
      dispatch: _dispatch,
      dispatchInternal: _dispatchInternal,
      reconcile: reconcile.bind(null, _controller, _dispatchInternal),
      readActiveSichtValue: readActiveSichtValue.bind(null, _controller),
      readActiveFilterKey: readActiveFilterKey.bind(null, _controller),
      guardRun: guardRun.bind(null, _controller),
      isStale: isStale.bind(null, _controller)
    };
  }

  return __controller;
});
