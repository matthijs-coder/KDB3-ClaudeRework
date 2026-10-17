define([
  "../errorCodes.js",
], function (_errorCodes) {
  "use strict";

  // Shared primitive checks and the invalid-diagnostic writer used by all
  // per-section validators.

  function pushInvalid(diagnostics, message, details) {
    diagnostics.push(_errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_INVALID_V3_PAYLOAD,
      "validate",
      message,
      details
    ));
  }

  function isStringArray(value) {
    return Array.isArray(value) && value.every(function (entry) {
      return typeof entry === "string";
    });
  }

  return Object.freeze({
    pushInvalid: pushInvalid,
    isStringArray: isStringArray,
  });
});
