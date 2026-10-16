define([
  "./buildInventoryReconciledAck.js"
], function (_support) {
  "use strict";

  async function awaitInventorySync(_promise, _payload) {
    try {
      var result = await _promise;
      return Object.assign({}, result, { source: _payload.source });
    } catch (_error) {
      console.error("[specialSingleSelect.awaitInventorySync] failed", _error);
      return {
        ok: false,
        acknowledged: false,
        inventoryGeneration: _payload.inventoryGeneration,
        source: _payload.source,
        diagnostics: [_support.buildDiagnostic(
          _support.ERROR_CODES.POLICY_APPLY_FAILED,
          String(_error && _error.message ? _error.message : _error)
        )]
      };
    }
  }

  async function runInventorySync(_controller, _scheduleSync, _payload, _token) {
    try {
      if (_payload.allowSpecialPolicy === false) {
        var skippedAck = _support.buildAck({
          ok: true,
          degraded: false,
          diagnostics: [{
            code: "SPECIAL_SINGLE_SELECT_POLICY_SYNC_SKIPPED",
            message: "special policy sync was skipped because allowSpecialPolicy is false"
          }]
        }, _payload);
        skippedAck.acknowledged = true;
        skippedAck.degraded = false;
        return skippedAck;
      }
      var syncResult = await _scheduleSync(_controller, {
        inventoryGeneration: _payload.inventoryGeneration,
        source: _payload.source
      });
      var ack = _support.buildAck(syncResult, _payload);
      if (_controller.inventorySyncToken === _token &&
        ack.ok === true &&
        ack.acknowledged === true) {
        _controller.lastInventoryGeneration = _payload.inventoryGeneration;
        _controller.lastInventoryResult = Object.assign({}, ack);
      }
      return ack;
    } catch (_error) {
      console.error("[specialSingleSelect.runInventorySync] failed", _error);
      return _support.buildAck({
        ok: false,
        diagnostics: [_support.buildDiagnostic(
          _support.ERROR_CODES.POLICY_APPLY_FAILED,
          String(_error && _error.message ? _error.message : _error)
        )]
      }, _payload);
    } finally {
      if (_controller.inventorySyncToken === _token) {
        _controller.pendingInventoryGeneration = null;
        _controller.inventorySyncToken = null;
        delete _controller.runtime.pendingPromises.inventoryReconciled;
      }
    }
  }

  function routeInventoryReconciled(_controller, _scheduleSync, _payload) {
    try {
      var payload = _payload || {};
      var validationError = _support.validatePayload(payload);
      if (validationError) {
        return Promise.resolve(_support.buildAck({
          ok: false,
          acknowledged: false,
          diagnostics: [validationError]
        }, payload));
      }
      if (_controller.lastInventoryGeneration === payload.inventoryGeneration) {
        return Promise.resolve(Object.assign(
          {},
          _controller.lastInventoryResult,
          { source: payload.source }
        ));
      }
      if (_controller.lastInventoryGeneration != null &&
        payload.inventoryGeneration < _controller.lastInventoryGeneration) {
        return Promise.resolve(_support.buildStaleAck(payload));
      }
      var pending = _controller.runtime.pendingPromises.inventoryReconciled;
      if (_controller.pendingInventoryGeneration === payload.inventoryGeneration && pending) {
        return awaitInventorySync(pending, payload);
      }
      if (_controller.pendingInventoryGeneration != null &&
        payload.inventoryGeneration < _controller.pendingInventoryGeneration) {
        return Promise.resolve(_support.buildStaleAck(payload));
      }
      var token = {};
      _controller.pendingInventoryGeneration = payload.inventoryGeneration;
      _controller.inventorySyncToken = token;
      var promise = runInventorySync(_controller, _scheduleSync, payload, token);
      _controller.runtime.pendingPromises.inventoryReconciled = promise;
      return promise;
    } catch (_error) {
      console.error("[specialSingleSelect.routeInventoryReconciled] failed", _error);
      return Promise.resolve(_support.buildAck({
        ok: false,
        diagnostics: [_support.buildDiagnostic(
          _support.ERROR_CODES.POLICY_APPLY_FAILED,
          String(_error && _error.message ? _error.message : _error)
        )]
      }, _payload || {}));
    }
  }

  return routeInventoryReconciled;
});
