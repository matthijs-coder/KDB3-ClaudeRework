define([], function () {
  "use strict";

  function __controller(_partial) {
    var src = _partial && typeof _partial === "object" ? _partial : {};
    var diagSrc = src.diagnostics && typeof src.diagnostics === "object" ? src.diagnostics : {};
    var warnings = Array.isArray(diagSrc.warnings) ? diagSrc.warnings.slice() : [];
    var ok = src.ok === true;
    return {
      ok: ok,
      status: ok ? "success" : "error",
      errorCode: src.errorCode == null ? null : src.errorCode,
      errorMessage: src.errorMessage == null ? null : src.errorMessage,
      url: src.url == null ? null : src.url,
      source: src.source == null ? null : src.source,
      widgetId: src.widgetId == null ? null : src.widgetId,
      drillConfig: src.drillConfig == null ? null : src.drillConfig,
      diagnostics: {
        service: "drillthrough",
        operation: diagSrc.operation || "buildDrillthroughUrl",
        hostEnv: diagSrc.hostEnv == null ? null : diagSrc.hostEnv,
        failedStage: diagSrc.failedStage == null ? null : diagSrc.failedStage,
        warnings: warnings
      }
    };
  }

  return __controller;
});
