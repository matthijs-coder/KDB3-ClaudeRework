define([
  "../schema/detectSourceFormat.js",
  "../../../core/config/writebackErrorCodes.js",
], function (_detectSourceFormat, _errorCodes) {
  "use strict";

  // Input canonicalization for WBParameterSetFunction (§3.3): legacy callers
  // hand over a JSON string, an object, or a single-element array wrapping of
  // either. Returns { payload, format } for restore statuses or throws a
  // WritebackError; no mapping logic lives here (that stays in writebackMap).
  function normalizeBridgeSetInput(_raw, status) {
    let raw = _raw;
    if (Array.isArray(raw) && raw.length === 1) {
      raw = raw[0]; // legacy single-element array wrapping (§3.3)
    }
    if (raw === undefined || raw === null || raw === "") {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_INVALID_V3_PAYLOAD, "bridge",
        "WBParameterSetFunction received an empty payload for a restore status",
        { status: status }
      );
    }

    let parsed = raw;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (parseError) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_UNSUPPORTED_LEGACY_FORMAT, "bridge",
          "WBParameterSetFunction payload is not valid JSON",
          { error: String(parseError && parseError.message ? parseError.message : parseError) }
        );
      }
    }
    if (Array.isArray(parsed) && parsed.length === 1) {
      parsed = parsed[0]; // array wrapping around an already-parsed payload
    }

    return { payload: parsed, format: _detectSourceFormat(parsed) };
  }

  return normalizeBridgeSetInput;
});
