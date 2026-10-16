define([
  "../../effects/ensureNativeMultiSelectRuntime.js",
  "../../config/parameterSetCodes.js"
], function (_ensureRuntime, _codes) {
  "use strict";

  function ensureRuntime(_controller) {
    _controller.runtime = _controller.runtime || _ensureRuntime(_controller._KDB);
    return _controller.runtime;
  }

  function guardRun(_controller, _payload) {
    var payload = _payload || {};
    var runId = payload.runId;
    if (typeof runId !== "number" || !isFinite(runId)) {
      return { ok: false, diagnostics: [{ code: _codes.CANCELLED, message: "NativeMultiSelect parameterSet action requires a numeric runId" }] };
    }
    var runtime = ensureRuntime(_controller);
    if (typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId) {
      return { ok: false, diagnostics: [{ code: _codes.CANCELLED, message: "stale parameterSet runId " + runId + " superseded by " + runtime.parameterSetRunId }] };
    }
    runtime.parameterSetRunId = runId;
    return null;
  }

  function isStale(_controller, runId) {
    var runtime = _controller.runtime;
    return !!(runtime && typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId);
  }

  function createParameterSetContext(_controller, _dispatchInternal) {
    return {
      _KDB: _controller._KDB,
      filtersFacet: _controller.filtersFacet,
      dispatchInternal: _dispatchInternal,
      guardRun: guardRun.bind(null, _controller),
      isStale: isStale.bind(null, _controller),
      ensureRuntime: ensureRuntime.bind(null, _controller)
    };
  }

  return createParameterSetContext;
});
