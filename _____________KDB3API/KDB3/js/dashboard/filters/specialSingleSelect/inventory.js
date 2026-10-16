define([
  "./config.js",
  "./sync.js",
  "../singleSelect/selectors.js"
], function (_config, _sync, _singleSelectSelectors) {
  "use strict";

  var errorCodes = _config.ERROR_CODES;

  function buildDiagnostic(_code, _message) {
    return { code: _code, message: _message || _code };
  }

  function readErrorMessage(_error) {
    return String(_error && _error.message ? _error.message : _error);
  }

  function isNonNegativeInteger(_value) {
    return typeof _value === "number" && isFinite(_value) && _value >= 0 && Math.floor(_value) === _value;
  }

  function validateInventoryPayload(_payload) {
    var generation = _payload && _payload.inventoryGeneration;
    var source = _payload && _payload.source;
    if (!isNonNegativeInteger(generation)) {
      return buildDiagnostic(
        errorCodes.INVENTORY_PAYLOAD_INVALID,
        "inventoryGeneration must be a non-negative integer"
      );
    }
    if (typeof source !== "string" || !source.trim()) {
      return buildDiagnostic(
        errorCodes.INVENTORY_PAYLOAD_INVALID,
        "inventory reconcile source is required"
      );
    }
    return null;
  }

  function buildInventoryAck(_syncResult, _payload) {
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
    return buildInventoryAck({
      ok: false,
      diagnostics: [buildDiagnostic(
        errorCodes.INVENTORY_STALE,
        "inventory generation is older than the latest scheduled generation"
      )]
    }, _payload);
  }

  function buildPolicyFailureAck(_error, _payload) {
    return buildInventoryAck({
      ok: false,
      diagnostics: [buildDiagnostic(errorCodes.POLICY_APPLY_FAILED, readErrorMessage(_error))]
    }, _payload);
  }

  async function awaitInventorySync(_promise, _payload) {
    var result = await _promise;
    return Object.assign({}, result, { source: _payload.source });
  }

  async function runInventorySync(_ctx, _payload, _token) {
    try {
      if (_payload.allowSpecialPolicy === false) {
        var skippedAck = buildInventoryAck({
          ok: true,
          degraded: false,
          diagnostics: [{
            code: errorCodes.POLICY_SYNC_SKIPPED,
            message: "special policy sync was skipped because allowSpecialPolicy is false"
          }]
        }, _payload);
        skippedAck.acknowledged = true;
        skippedAck.degraded = false;
        return skippedAck;
      }
      var syncResult = await _sync.scheduleSync(_ctx, {
        inventoryGeneration: _payload.inventoryGeneration,
        source: _payload.source
      });
      var ack = buildInventoryAck(syncResult, _payload);
      if (_ctx.inventorySyncToken === _token &&
        ack.ok === true &&
        ack.acknowledged === true) {
        _ctx.lastInventoryGeneration = _payload.inventoryGeneration;
        _ctx.lastInventoryResult = Object.assign({}, ack);
      }
      return ack;
    } catch (_error) {
      console.error("[specialSingleSelect.runInventorySync] failed", _error);
      return buildPolicyFailureAck(_error, _payload);
    } finally {
      if (_ctx.inventorySyncToken === _token) {
        _ctx.pendingInventoryGeneration = null;
        _ctx.inventorySyncToken = null;
        delete _ctx.runtime.pendingPromises.inventoryReconciled;
      }
    }
  }

  function routeInventoryReconciled(_ctx, _payload) {
    try {
      var payload = _payload || {};
      var validationError = validateInventoryPayload(payload);
      if (validationError) {
        return Promise.resolve(buildInventoryAck({
          ok: false,
          acknowledged: false,
          diagnostics: [validationError]
        }, payload));
      }
      if (_ctx.lastInventoryGeneration === payload.inventoryGeneration) {
        return Promise.resolve(Object.assign(
          {},
          _ctx.lastInventoryResult,
          { source: payload.source }
        ));
      }
      if (_ctx.lastInventoryGeneration != null &&
        payload.inventoryGeneration < _ctx.lastInventoryGeneration) {
        return Promise.resolve(buildStaleAck(payload));
      }
      var pending = _ctx.runtime.pendingPromises.inventoryReconciled;
      if (_ctx.pendingInventoryGeneration === payload.inventoryGeneration && pending) {
        return awaitInventorySync(pending, payload);
      }
      if (_ctx.pendingInventoryGeneration != null &&
        payload.inventoryGeneration < _ctx.pendingInventoryGeneration) {
        return Promise.resolve(buildStaleAck(payload));
      }
      var token = {};
      _ctx.pendingInventoryGeneration = payload.inventoryGeneration;
      _ctx.inventorySyncToken = token;
      var promise = runInventorySync(_ctx, payload, token);
      _ctx.runtime.pendingPromises.inventoryReconciled = promise;
      return promise;
    } catch (_error) {
      console.error("[specialSingleSelect.routeInventoryReconciled] failed", _error);
      return Promise.resolve(buildPolicyFailureAck(_error, _payload || {}));
    }
  }

  function normalizeInventoryGeneration(_payload) {
    var generation = _payload && _payload.inventoryGeneration;
    return isNonNegativeInteger(generation) ? generation : null;
  }

  function buildSyncRequestedAck(_syncResult, _payload) {
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

  function validateSyncRequestedGeneration(_ctx, _payload) {
    var requested = normalizeInventoryGeneration(_payload);
    if (!_payload || _payload.inventoryGeneration == null) {
      return null;
    }
    if (requested == null) {
      return buildSyncRequestedAck({
        ok: false,
        diagnostics: [buildDiagnostic(
          errorCodes.INVENTORY_PAYLOAD_INVALID,
          "inventoryGeneration must be a non-negative integer"
        )]
      }, _payload);
    }
    var current = _singleSelectSelectors.readInventoryGeneration(_ctx._KDB);
    if (typeof current === "number" && isFinite(current) && requested < current) {
      return buildSyncRequestedAck({
        ok: false,
        diagnostics: [buildDiagnostic(
          errorCodes.INVENTORY_STALE,
          "inventory generation is older than the current singleSelect inventory generation"
        )]
      }, _payload);
    }
    return null;
  }

  async function routeSyncRequested(_ctx, _payload) {
    var payload = _payload || {};
    var validationAck = validateSyncRequestedGeneration(_ctx, payload);
    if (validationAck) {
      return validationAck;
    }
    try {
      var syncResult = await _sync.scheduleSync(_ctx, payload);
      return buildSyncRequestedAck(syncResult, payload);
    } catch (_error) {
      console.error("[specialSingleSelect.routeSyncRequested] failed", _error);
      return buildSyncRequestedAck({
        ok: false,
        diagnostics: [buildDiagnostic(errorCodes.POLICY_APPLY_FAILED, readErrorMessage(_error))]
      }, payload);
    }
  }

  return {
    routeInventoryReconciled: routeInventoryReconciled,
    routeSyncRequested: routeSyncRequested
  };
});
