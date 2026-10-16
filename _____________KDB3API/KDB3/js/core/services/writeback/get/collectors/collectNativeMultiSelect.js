define([
  "../../schema/errorCodes.js"
], function (_errorCodes) {
  "use strict";

  function collectNativeMultiSelect(_KDB, diagnostics, liveTabTargets) {
    try {
      var api = _KDB && _KDB.api ? _KDB.api.nativeMultiSelect : null;
      if (!api || typeof api.dispatch !== "function") {
        diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
          "get",
          "pcfs collector skipped because nativeMultiSelect API is missing"
        ));
        return null;
      }
      if (!liveTabTargets) {
        diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
          "get",
          "pcfs page collect skipped because live tab targets are missing"
        ));
      }
      var result = api.dispatch({
        type: "nativeMultiSelect/collectWritebackSnapshotRequested",
        payload: { tabIdxToScopeId: liveTabTargets, source: "writebackGet" }
      });
      if (result && Array.isArray(result.diagnostics)) {
        result.diagnostics.forEach(function (diag) { diagnostics.push(diag); });
      }
      // Fail-visible (remediation B3): a crashed snapshot (ok: false) must not
      // silently drop the pcfs section; the marker aborts the save.
      if (!result || result.ok !== true) {
        diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_COLLECTOR_FAILED,
          "get",
          "nativeMultiSelect snapshot failed",
          { collector: "nativeMultiSelect", ok: result ? result.ok : undefined }
        ));
        return null;
      }
      var entries = result && Array.isArray(result.entries) ? result.entries : [];
      return entries.length > 0 ? entries : null;
    } catch (error) {
      diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_COLLECTOR_FAILED,
        "get",
        "nativeMultiSelect collector failed",
        { collector: "nativeMultiSelect", error: error && error.message ? error.message : String(error) }
      ));
      return null;
    }
  }

  return collectNativeMultiSelect;
});
