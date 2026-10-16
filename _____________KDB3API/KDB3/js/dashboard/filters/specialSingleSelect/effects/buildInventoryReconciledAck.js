define([
  "../config/errorCodes.js"
], function (_errorCodes) {
  "use strict";

  function buildDiagnostic(_code, _message) {
    return { code: _code, message: _message || _code };
  }

  function validatePayload(_payload) {
    var generation = _payload && _payload.inventoryGeneration;
    var source = _payload && _payload.source;
    if (typeof generation !== "number" || !isFinite(generation) ||
      generation < 0 || Math.floor(generation) !== generation) {
      return buildDiagnostic(
        _errorCodes.INVENTORY_PAYLOAD_INVALID,
        "inventoryGeneration must be a non-negative integer"
      );
    }
    if (typeof source !== "string" || !source.trim()) {
      return buildDiagnostic(
        _errorCodes.INVENTORY_PAYLOAD_INVALID,
        "inventory reconcile source is required"
      );
    }
    return null;
  }

  function buildAck(_syncResult, _payload) {
    var result = _syncResult || {};
    return {
      ok: result.ok === true,
      acknowledged: result.ok === true && result.degraded !== true,
      degraded: result.degraded === true || result.ok !== true,
      disposed: result.disposed === true,
      inventoryGeneration: _payload.inventoryGeneration,
      source: _payload.source,
      diagnostics: Array.isArray(result.diagnostics)
        ? result.diagnostics.slice()
        : []
    };
  }

  function buildStaleAck(_payload) {
    return buildAck({
      ok: false,
      diagnostics: [buildDiagnostic(
        _errorCodes.INVENTORY_STALE,
        "inventory generation is older than the latest scheduled generation"
      )]
    }, _payload);
  }

  return {
    ERROR_CODES: _errorCodes,
    buildDiagnostic: buildDiagnostic,
    validatePayload: validatePayload,
    buildAck: buildAck,
    buildStaleAck: buildStaleAck
  };
});
