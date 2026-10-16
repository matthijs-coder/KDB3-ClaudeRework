define([
  "../config/restoreConstants.js",
  "../../schema/normalizeV3.js",
  "../../schema/validateV3.js",
  "../../schema/errorCodes.js",
  "../../../../config/mapping/kidIndex.js",
], function (_constants, _normalizeV3, _validateV3, _errorCodes, _kidIndex) {
  "use strict";

  // §6 step 8: defensive normalize + validate, even for claimed-v3 callers
  // (§2.4). Returns the normalized payload or throws ABORT after recording the
  // failed validate phase.
  function validateRestorePayload(run, v3) {
    let normalized;
    try {
      normalized = _normalizeV3(v3, { diagnostics: run.diagnostics });
    } catch (error) {
      run.recordPhase("validate", null, false, false,
        [error && error.diagnostic ? error.diagnostic : null].filter(Boolean));
      run.addDiagnostic(_errorCodes.codes.WRITEBACK_SCHEMA_NORMALIZE_FAILED, "validate", "v3 normalization failed");
      throw _constants.ABORT;
    }

    const validation = _validateV3(normalized);
    validation.diagnostics.forEach(function (diagnostic) {
      run.diagnostics.push(withRunId(diagnostic, run.runId));
    });

    // Diagnostic-tolerant unsupported objects (§4.6) keep the payload valid but
    // cap the outcome at "degraded".
    const tolerantCodes = [
      _errorCodes.codes.WRITEBACK_WIDGET_KIND_UNSUPPORTED,
      _errorCodes.codes.WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED,
      _errorCodes.codes.WRITEBACK_HEADER_FIELD_UNSUPPORTED,
      _errorCodes.codes.WRITEBACK_FILTER_KIND_UNSUPPORTED,
    ];
    const hasTolerantUnsupported = validation.diagnostics.some(function (diagnostic) {
      return tolerantCodes.indexOf(diagnostic.code) !== -1;
    });
    if (!validation.ok) {
      run.recordPhase("validate", null, false, false);
      throw _constants.ABORT;
    }

    const runtimePkg = resolveRuntimePackageKey();
    if (runtimePkg == null || String(runtimePkg).trim() === "") {
      run.addDiagnostic(_errorCodes.codes.WRITEBACK_MAPPING_CONFIG_MISSING, "validate",
        "runtime package key could not be resolved from parameter mapping");
      run.recordPhase("validate", null, false, false);
      throw _constants.ABORT;
    }
    if (String(normalized.pkg) !== String(runtimePkg)) {
      run.addDiagnostic(_errorCodes.codes.WRITEBACK_MAPPING_PACKAGE_MISMATCH, "validate",
        "v3 pkg does not match runtime package key");
      run.recordPhase("validate", null, false, false);
      throw _constants.ABORT;
    }

    run.recordPhase("validate", null, true, hasTolerantUnsupported);
    return normalized;
  }

  function resolveRuntimePackageKey() {
    try {
      return _kidIndex.resolveRuntimePackageKey(null);
    } catch (error) {
      console.error("[writebackSet.resolveRuntimePackageKey] failed", error);
      return null;
    }
  }

  function withRunId(diagnostic, runId) {
    if (diagnostic && typeof diagnostic === "object" && diagnostic.runId === undefined) {
      return Object.assign({}, diagnostic, { runId: runId });
    }
    return diagnostic;
  }

  return validateRestorePayload;
});
