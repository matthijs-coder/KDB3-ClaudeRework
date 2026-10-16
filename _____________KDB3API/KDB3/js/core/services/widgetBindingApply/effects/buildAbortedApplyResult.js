define([
  "../diagnostics/createApplyResult.js",
], function (_createApplyResult) {
  "use strict";

  function __controller(_plan, _diagnosticsBuilder) {
    var diagnostics = _diagnosticsBuilder.finishDiagnostics({
      aborted: true,
      errorCode: "WIDGET_BINDING_APPLY_ABORTED",
    });
    return _createApplyResult("aborted", _plan, diagnostics);
  }

  return __controller;
});
