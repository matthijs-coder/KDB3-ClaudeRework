define([
  "../config/errorCodes.js",
  "../../singleSelect/state/selectors.js"
], function (_errorCodes, _singleSelectSelectors) {
  "use strict";

  function buildDiagnostic(_code, _message) {
    return { code: _code, message: _message || _code };
  }

  function normalizeInventoryGeneration(_payload) {
    var generation = _payload && _payload.inventoryGeneration;
    if (typeof generation !== "number" || !isFinite(generation) ||
      generation < 0 || Math.floor(generation) !== generation) {
      return null;
    }
    return generation;
  }

  function buildAck(_syncResult, _payload) {
    var result = _syncResult || {};
    var diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics.slice() : [];
    var ok = result.ok === true;
    var degraded = result.degraded === true || ok !== true || diagnostics.length > 0;
    return {
      ok: ok,
      acknowledged: ok === true && degraded !== true,
      degraded: degraded === true,
      inventoryGeneration: normalizeInventoryGeneration(_payload),
      diagnostics: diagnostics,
      specialSingleSelectRestoreHint: {
        clearedRestoredValues: Array.isArray(result.clearedRestoredValues) ? result.clearedRestoredValues.slice() : [],
        appliedDefaultLabels: Array.isArray(result.appliedDefaultLabels) ? result.appliedDefaultLabels.slice() : []
      }
    };
  }

  function validateInventoryGeneration(_controller, _payload) {
    var requested = normalizeInventoryGeneration(_payload);
    if (!_payload || _payload.inventoryGeneration == null) {
      return null;
    }
    if (requested == null) {
      return buildAck({
        ok: false,
        diagnostics: [buildDiagnostic(
          _errorCodes.INVENTORY_PAYLOAD_INVALID,
          "inventoryGeneration must be a non-negative integer"
        )]
      }, _payload);
    }
    var current = _singleSelectSelectors.readInventoryGeneration(_controller._KDB);
    if (typeof current === "number" && isFinite(current) && requested < current) {
      return buildAck({
        ok: false,
        diagnostics: [buildDiagnostic(
          _errorCodes.INVENTORY_STALE,
          "inventory generation is older than the current singleSelect inventory generation"
        )]
      }, _payload);
    }
    return null;
  }

  async function routeSyncRequested(_controller, _scheduleSync, _payload) {
    var payload = _payload || {};
    var validationAck = validateInventoryGeneration(_controller, payload);
    if (validationAck) {
      return validationAck;
    }
    try {
      var syncResult = await _scheduleSync(_controller, payload);
      return buildAck(syncResult, payload);
    } catch (_error) {
      console.error("[specialSingleSelect.routeSyncRequested] failed", _error);
      return buildAck({
        ok: false,
        diagnostics: [buildDiagnostic(
          _errorCodes.POLICY_APPLY_FAILED,
          String(_error && _error.message ? _error.message : _error)
        )]
      }, payload);
    }
  }

  return {
    routeSyncRequested: routeSyncRequested,
    buildSyncRequestedAck: buildAck
  };
});
