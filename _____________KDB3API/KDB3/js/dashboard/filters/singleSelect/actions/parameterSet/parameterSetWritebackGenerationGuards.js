define([
  "../../config/parameterSetCodes.js",
  "./parameterSetRuntimeRegistry.js"
], function (_codes, _registry) {
  "use strict";

  function failureResult(_code, _message) {
    return {
      ok: false,
      degraded: false,
      applied: [],
      skipped: [],
      diagnostics: [{ code: _code, message: _message }]
    };
  }

  function ensureWritebackPinnedGeneration(_KDB, _payload) {
    try {
      var payload = _payload || {};
      var source = payload.source == null ? "" : String(payload.source);
      var root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
      var inventory = root && root.inventory ? root.inventory : null;
      var currentGeneration = inventory && isFinite(Number(inventory.generation))
        ? Number(inventory.generation) : null;
      var registry = _registry.ensureRunRegistry(_KDB, payload.runId);
      var pinnedGeneration = registry && registry.inventoryGeneration != null &&
        isFinite(Number(registry.inventoryGeneration))
        ? Number(registry.inventoryGeneration) : null;
      var requestedGeneration = payload.inventoryGeneration;
      var hasRequestedGeneration = requestedGeneration != null && isFinite(Number(requestedGeneration));
      if (source !== "writebackSet") {
        return { ok: true, shouldBypassReconcile: false, isWriteback: false };
      }
      if (!hasRequestedGeneration && pinnedGeneration == null) {
        return { ok: false, code: _codes.INVENTORY_STALE, message: "writebackSet requires a numeric inventoryGeneration" };
      }
      if (hasRequestedGeneration) {
        requestedGeneration = Number(requestedGeneration);
        if (pinnedGeneration != null && requestedGeneration !== pinnedGeneration) {
          return { ok: false, code: _codes.INVENTORY_STALE, message: "writebackSet inventoryGeneration mismatches the pinned run generation" };
        }
        if (pinnedGeneration == null) {
          registry.inventoryGeneration = requestedGeneration;
          pinnedGeneration = requestedGeneration;
        }
      }
      if (currentGeneration == null || pinnedGeneration == null ||
        currentGeneration !== Number(pinnedGeneration) ||
        String(inventory.freshness || "") !== "fresh") {
        return { ok: false, code: _codes.INVENTORY_STALE, message: "singleSelect pinned writeback inventory generation is stale" };
      }
      return {
        ok: true,
        shouldBypassReconcile: true,
        isWriteback: true,
        generation: Number(pinnedGeneration)
      };
    } catch (error) {
      return {
        ok: false,
        code: _codes.RESTORE_FAILED,
        message: "singleSelect writeback generation guard failed: " +
          String(error && error.message ? error.message : error)
      };
    }
  }

  function validateMutationGuard(_KDB, _payload) {
    try {
      var payload = _payload || {};
      var runId = Number(payload.runId);
      var runtime = _registry.ensureRuntime(_KDB);
      if (!isFinite(runId)) {
        return failureResult(_codes.CANCELLED, "singleSelect mutation guard requires a numeric runId");
      }
      if (typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId) {
        return failureResult(
          _codes.CANCELLED,
          "singleSelect mutation guard blocked stale runId " + runId +
            " superseded by " + runtime.parameterSetRunId
        );
      }
      var pinGate = ensureWritebackPinnedGeneration(_KDB, payload);
      if (!pinGate.ok) {
        return failureResult(pinGate.code || _codes.INVENTORY_STALE, pinGate.message);
      }
      var root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
      var inventory = root && root.inventory ? root.inventory : null;
      var freshness = inventory ? String(inventory.freshness || "") : "";
      if (freshness !== "fresh") {
        return failureResult(_codes.INVENTORY_STALE, "singleSelect inventory is not fresh during parameterSet mutation");
      }
      if (pinGate.isWriteback === true) {
        var pinned = Number(pinGate.generation);
        var observed = inventory && isFinite(Number(inventory.generation))
          ? Number(inventory.generation) : null;
        if (observed == null || observed !== pinned) {
          return failureResult(
            _codes.INVENTORY_STALE,
            "singleSelect writeback pinned generation changed before canonical mutation"
          );
        }
      }
      return { ok: true, degraded: false, applied: [], skipped: [], diagnostics: [] };
    } catch (error) {
      return failureResult(
        _codes.RESTORE_FAILED,
        "singleSelect mutation guard failed: " + String(error && error.message ? error.message : error)
      );
    }
  }

  return {
    ensureWritebackPinnedGeneration: ensureWritebackPinnedGeneration,
    validateMutationGuard: validateMutationGuard
  };
});
