define([
  "./resolveBindingPrerequisites.js",
  "../runtime.js",
  "./continueBindingPipeline.js"
], function (_resolveBindingPrerequisites, _visRuntime, _continueBindingPipeline) {
  "use strict";

  function runBindingPipeline(_context, _input) {
    var _KDB = _context._KDB;
    var widgetId = _input.widgetId;
    var opSeq = _context.ensureOpSeq(widgetId, _input.opSeq);
    var runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
    _visRuntime.abortActiveApply(runtime);

    if (typeof AbortController !== "function") {
      console.error("[widgetVis.runBindingPipeline] AbortController unavailable");
      return Promise.resolve({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        status: "error",
        errorCode: "WIDGET_VIS_ABORT_SIGNAL_UNAVAILABLE",
        errorMessage: "AbortController is unavailable; binding apply requires a valid AbortSignal."
      });
    }

    var abortController = new AbortController();
    runtime.abortControllers.applyBinding = abortController;

    var planService = _KDB.services && _KDB.services.widgetBindingPlan;
    if (!planService || typeof planService.buildPlan !== "function") {
      console.error("[widgetVis.runBindingPipeline] widgetBindingPlan service missing");
      return Promise.resolve({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        errorCode: "WIDGET_VIS_BINDING_PLAN_FAILED",
        errorMessage: "widgetBindingPlan.buildPlan is not registered."
      });
    }

    return Promise.resolve(_resolveBindingPrerequisites.resolveBindingPrerequisites(
      _context,
      Object.assign({}, _input, { widgetId: widgetId, opSeq: opSeq })
    )).then(function (gateResult) {
      if (!gateResult || gateResult.ok !== true) {
        return gateResult || {
          ok: false,
          widgetId: widgetId,
          opSeq: opSeq,
          status: "error",
          errorCode: "WIDGET_VIS_BINDING_PREREQUISITE_FAILED"
        };
      }
      return _continueBindingPipeline(_context, gateResult.input, {
        _KDB: _KDB,
        widgetId: widgetId,
        opSeq: opSeq,
        runtime: runtime,
        abortController: abortController,
        planService: planService
      });
    });
  }

  return runBindingPipeline;
});
