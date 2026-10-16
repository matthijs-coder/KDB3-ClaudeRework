define([
  "./guardTabMutation.js",
  "./buildTabMutationTransfers.js",
  "./applyTabMutationWrites.js",
  "../reconcileFilterInstances.js",
  "./applyTabMutationRestoreDeleted.js",
  "../../config.js"
], function (_support, _buildTransfers, _writes, _reconcile, _restoreDeleted, _config) {
  "use strict";

  function applyOverlay(_root, _targetId, _sourceSnapshot) {
    var target = _root.instancesById && _root.instancesById[_targetId];
    if (!target || !_sourceSnapshot) { return; }
    target.currentSelection = _sourceSnapshot.currentSelection
      ? Object.assign({}, _sourceSnapshot.currentSelection) : null;
    target.backupSelection = _sourceSnapshot.backupSelection
      ? Object.assign({}, _sourceSnapshot.backupSelection) : null;
    target.pendingSelection = _sourceSnapshot.pendingSelection
      ? Object.assign({}, _sourceSnapshot.pendingSelection) : null;
  }

  async function __controller(_KDB, _runtime, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    var appliedScopes = [];
    var clearedScopes = [];
    try {
      var guard = _support.guardRun(_runtime, payload);
      if (guard) { return guard; }
      var snapshot = _runtime.tabMutationSnapshots &&
        _runtime.tabMutationSnapshots[payload.operationId];
      if (!snapshot || snapshot.runId !== payload.runId) {
        return { ok: false, operationId: payload.operationId, appliedScopes: [], clearedScopes: [], diagnostics: [_writes.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, "prepare snapshot missing")] };
      }
      var work = _buildTransfers(payload.plan);
      var overlays = {};
      var clearedIds = {};
      for (var c = 0; c < work.clearSlots.length; c += 1) {
        var cleared = await _writes.clearScope(_KDB, _runtime, payload, work.clearSlots[c], clearedIds);
        diagnostics = diagnostics.concat(cleared.diagnostics);
        if (_support.isStaleRun(_runtime, payload)) {
          return _support.cancelled("tab mutation apply superseded during clear");
        }
        if (cleared.scopeId && clearedScopes.indexOf(cleared.scopeId) === -1) { clearedScopes.push(cleared.scopeId); }
      }
      for (var i = 0; i < work.transfers.length; i += 1) {
        var transfer = await _writes.applyTransfer(_KDB, _runtime, payload, snapshot, work.transfers[i], overlays);
        diagnostics = diagnostics.concat(transfer.diagnostics);
        if (_support.isStaleRun(_runtime, payload)) {
          return _support.cancelled("tab mutation apply superseded during transfer");
        }
        if (transfer.scopeId && appliedScopes.indexOf(transfer.scopeId) === -1) { appliedScopes.push(transfer.scopeId); }
      }
      if (payload.plan && payload.plan.operation === "restoreDeleted") {
        var restored = await _restoreDeleted.writeRestoreSlice(_KDB, _runtime, payload, overlays);
        diagnostics = diagnostics.concat(restored.diagnostics);
        if (_support.isStaleRun(_runtime, payload)) {
          return _support.cancelled("tab mutation apply superseded during restore");
        }
        if (restored.scopeId && appliedScopes.indexOf(restored.scopeId) === -1) { appliedScopes.push(restored.scopeId); }
      }
      if (diagnostics.length > 0) {
        return { ok: false, operationId: payload.operationId, appliedScopes: appliedScopes, clearedScopes: clearedScopes, diagnostics: diagnostics };
      }
      var reconciled = await _reconcile(_KDB, _runtime, { reason: "tabMutation", runId: payload.runId });
      if (!reconciled.ok || _runtime.tabMutationRunId !== payload.runId) {
        return _support.cancelled("tab mutation reconcile failed or was superseded");
      }
      var root = _KDB.state.filters.singleSelect;
      Object.keys(clearedIds).forEach(function (_id) {
        applyOverlay(root, _id, {
          currentSelection: { displayValue: "Alle", useValue: "", displaySource: "policy" },
          backupSelection: { displayValue: "Alle", useValue: "", displaySource: "policy" },
          pendingSelection: { displayValue: "Alle" }
        });
      });
      Object.keys(overlays).forEach(function (_id) { applyOverlay(root, _id, overlays[_id]); });
      return { ok: true, operationId: payload.operationId, appliedScopes: appliedScopes, clearedScopes: clearedScopes, diagnostics: reconciled.diagnostics || [] };
    } catch (error) {
      console.error("[singleSelect.applyTabMutation] failed", { operationId: payload.operationId }, error);
      diagnostics.push(_writes.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, String(error && error.message ? error.message : error)));
      return { ok: false, operationId: payload.operationId, appliedScopes: appliedScopes, clearedScopes: clearedScopes, diagnostics: diagnostics };
    }
  }

  return __controller;
});
