define([
  "../config/actions.js",
  "../effects/syncSichtOptionsAndStartup.js"
], function (_actions, _syncSichtOptionsAndStartup) {
  "use strict";

  function readLastGeneration(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters
      ? _KDB.state.filters.sicht : null;
    return state && state.meta ? state.meta.lastInventoryGeneration : null;
  }

  function buildAck(_overrides) {
    return Object.assign({
      ok: true,
      acknowledged: true,
      degraded: false,
      retried: false,
      code: null,
      diagnostics: []
    }, _overrides || {});
  }

  function isSuccessfulStartupResult(_result) {
    return !!(_result && (_result.ok === true ||
      (_result.reason === "skipped" &&
        (_result.skipReason === "startupDefaultCommitted" ||
          _result.skipReason === "currentSelectionAlreadySet"))));
  }

  async function handleInventoryReconciled(_ctx, _payload) {
    try {
      var payload = _payload || {};
      var generation = Number(
        payload.inventoryGeneration != null
          ? payload.inventoryGeneration
          : payload.generation
      );
      var allowStartupDefault = payload.allowStartupDefault === true;
      var lastGeneration = readLastGeneration(_ctx._KDB);
      if (!isFinite(generation)) {
        return buildAck({
          ok: false,
          acknowledged: false,
          code: "SICHT_INVENTORY_GENERATION_INVALID",
          message: "singleSelect inventory callback requires numeric inventoryGeneration"
        });
      }
      if (lastGeneration != null && generation < Number(lastGeneration)) {
        return buildAck({
          code: "SICHT_INVENTORY_GENERATION_STALE",
          retried: false
        });
      }
      if (lastGeneration != null && generation === Number(lastGeneration)) {
        return buildAck({
          code: "SICHT_INVENTORY_GENERATION_DUPLICATE",
          retried: false
        });
      }
      if (!allowStartupDefault) {
        _ctx.dispatchInternal({
          type: _actions.SINGLE_SELECT_INVENTORY_RECONCILED,
          payload: {
            inventoryGeneration: generation,
            source: payload.source || "singleSelect",
            timestamp: payload.timestamp != null
              ? payload.timestamp : Date.now()
          }
        });
        return buildAck({
          code: "SICHT_INVENTORY_STARTUP_SKIPPED_BY_FLAG",
          retried: false
        });
      }
      var startupResult = await _syncSichtOptionsAndStartup(
        _ctx._KDB,
        _ctx.dispatchInternal
      );
      var succeeded = isSuccessfulStartupResult(startupResult);
      if (succeeded) {
        _ctx.dispatchInternal({
          type: _actions.SINGLE_SELECT_INVENTORY_RECONCILED,
          payload: {
            inventoryGeneration: generation,
            source: payload.source || "singleSelect",
            timestamp: payload.timestamp != null
              ? payload.timestamp : Date.now()
          }
        });
      }
      return buildAck({
        degraded: !succeeded ||
          (startupResult && startupResult.degraded === true),
        code: succeeded
          ? undefined : "SICHT_INVENTORY_STARTUP_RETRY_PENDING",
        retried: startupResult && startupResult.ok === true,
        startupResult: startupResult
      });
    } catch (error) {
      console.error("[sicht.handleInventoryReconciled] failed", error);
      return buildAck({
        ok: false,
        acknowledged: false,
        code: "SICHT_INVENTORY_RECONCILE_FAILED",
        message: String(error && error.message ? error.message : error)
      });
    }
  }

  async function handleSyncRequested(_ctx) {
    try {
      var startupResult = await _syncSichtOptionsAndStartup(
        _ctx._KDB, _ctx.dispatchInternal);
      var succeeded = isSuccessfulStartupResult(startupResult);
      return buildAck({
        ok: succeeded, acknowledged: succeeded,
        degraded: !succeeded ||
          (startupResult && startupResult.degraded === true),
        startupResult: startupResult
      });
    } catch (error) {
      console.error("[sicht.handleSyncRequested] failed", error);
      return buildAck({
        ok: false, acknowledged: false,
        code: "SICHT_SYNC_REQUESTED_FAILED",
        message: String(error && error.message ? error.message : error)
      });
    }
  }

  function routeSichtSyncAction(_ctx, _action) {
    try {
      var action = _action || {};
      if (action.type === _actions.SINGLE_SELECT_INVENTORY_RECONCILED) {
        return handleInventoryReconciled(_ctx, action.payload);
      }
      if (action.type === _actions.SYNC_REQUESTED) {
        return handleSyncRequested(_ctx);
      }
      return _syncSichtOptionsAndStartup(_ctx._KDB, _ctx.dispatchInternal);
    } catch (error) {
      console.error("[sicht.routeSichtSyncAction] failed", error);
      throw error;
    }
  }

  return routeSichtSyncAction;
});
