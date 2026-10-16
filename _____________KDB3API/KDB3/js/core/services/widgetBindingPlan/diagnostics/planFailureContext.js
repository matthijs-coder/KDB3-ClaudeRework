define([
  "./createPlanFailure.js",
], function (_createPlanFailure) {
  "use strict";

  function buildFailureContext(_spec, _diagnostics, _stage, _code, _message, _extra) {
    return Object.assign({
      reason: _spec && _spec.reason,
      targetKind: (_spec && _spec.targetKind) || "vis",
      widgetId: _spec && _spec.widgetId,
      ownerWidgetId: _spec && _spec.ownerWidgetId,
      opSeq: _spec && _spec.opSeq,
      diagnostics: _diagnostics,
      failedStage: _stage,
      errorCode: _code,
      errorMessage: _message,
      datasource: null,
      visualization: null,
    }, _extra || {});
  }

  function createPlanFailure(_spec, _diagnostics, _stage, _code, _message, _extra) {
    return _createPlanFailure(buildFailureContext(_spec, _diagnostics, _stage, _code, _message, _extra));
  }

  return {
    buildFailureContext: buildFailureContext,
    createPlanFailure: createPlanFailure,
  };
});
