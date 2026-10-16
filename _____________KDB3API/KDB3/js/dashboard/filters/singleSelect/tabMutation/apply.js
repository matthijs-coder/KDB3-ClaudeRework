define([
  "./guard.js",
  "./transfers.js",
  "../inventory/reconcile.js",
  "../hostFilterIo.js",
  "../config.js",
  "../../_core/tabMutation.js"
], function (_support, _transfers, _reconcileInventory, _hostFilterIo, _config, _tabMutation) {
  "use strict";

  function matchBySemanticKey(_instances, _scopeId, _snapshotRecord) {
    var wanted = _snapshotRecord && _snapshotRecord.semanticKey;
    var matches = _support.instancesInScope(_instances, _scopeId).filter(function (_record) {
      return _support.semanticKey(_record) === wanted;
    });
    return {
      status: matches.length === 1 ? "ok" : (matches.length > 1 ? "ambiguous" : "missing"),
      instance: matches.length === 1 ? matches[0] : null
    };
  }

  async function applyTransfer(_KDB, _runtime, _payload, _snapshot, _pair, _overlays) {
    try {
      if (_support.isStaleRun(_runtime, _payload)) {
        return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.TAB_MUTATION_CANCELLED, "tab mutation run superseded before transfer")] };
      }
      var instances = _KDB.state.filters.singleSelect.instancesById || {};
      var from = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, _pair.from);
      var to = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, _pair.to);
      var diagnostics = [];
      if (from.status !== "ok" || to.status !== "ok") {
        return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.SCOPE_TARGET_UNVERIFIED, "transfer scope is unverified")] };
      }
      var sourceRecords = _support.instancesInScope(instances, from.scopeId);
      for (var i = 0; i < sourceRecords.length; i += 1) {
        var source = sourceRecords[i];
        var sourceSnapshot = _snapshot.byId[source.filterInstanceId];
        var targetMatch = _support.matchTarget(instances, to.scopeId, source);
        if (!sourceSnapshot || targetMatch.status !== "ok") {
          diagnostics.push(_support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, "semantic target instance " + targetMatch.status, source));
          continue;
        }
        var targetId = targetMatch.instance.filterInstanceId;
        if (_overlays[targetId]) {
          diagnostics.push(_support.diagnostic(_config.errorCodes.IDENTITY_COLLISION, "target instance selected more than once", targetMatch.instance));
          continue;
        }
        var written = await _hostFilterIo.writeInstanceSelection(_KDB, _runtime, targetId, sourceSnapshot.hostValues);
        if (_support.isStaleRun(_runtime, _payload)) {
          diagnostics.push(_support.diagnostic(_config.errorCodes.TAB_MUTATION_CANCELLED, "tab mutation run superseded during transfer", targetMatch.instance));
          break;
        }
        if (!written.ok) {
          diagnostics.push(_support.diagnostic(written.errorCode, "target host write verification failed", targetMatch.instance));
          continue;
        }
        _overlays[targetId] = sourceSnapshot;
      }
      return { ok: diagnostics.length === 0, scopeId: to.scopeId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.applyTabMutationWrites.applyTransfer] failed", error);
      return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, String(error && error.message ? error.message : error))] };
    }
  }

  async function clearScope(_KDB, _runtime, _payload, _slot, _clearedIds) {
    try {
      if (_support.isStaleRun(_runtime, _payload)) {
        return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.TAB_MUTATION_CANCELLED, "tab mutation run superseded before clear")] };
      }
      var instances = _KDB.state.filters.singleSelect.instancesById || {};
      var resolved = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, _slot);
      var diagnostics = [];
      if (resolved.status !== "ok") {
        return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.SCOPE_TARGET_UNVERIFIED, "clear scope is unverified")] };
      }
      var records = _support.instancesInScope(instances, resolved.scopeId);
      for (var i = 0; i < records.length; i += 1) {
        var written = await _hostFilterIo.writeInstanceSelection(_KDB, _runtime, records[i].filterInstanceId, []);
        if (_support.isStaleRun(_runtime, _payload)) {
          diagnostics.push(_support.diagnostic(_config.errorCodes.TAB_MUTATION_CANCELLED, "tab mutation run superseded during clear", records[i]));
          break;
        }
        if (!written.ok) {
          diagnostics.push(_support.diagnostic(written.errorCode, "clear host write verification failed", records[i]));
        } else {
          _clearedIds[records[i].filterInstanceId] = true;
        }
      }
      return { ok: diagnostics.length === 0, scopeId: resolved.scopeId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.applyTabMutationWrites.clearScope] failed", error);
      return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, String(error && error.message ? error.message : error))] };
    }
  }

  async function writeRestoreSlice(_KDB, _runtime, _payload, _overlays) {
    try {
      var plan = _payload.plan || {};
      var restore = plan.restore && plan.restore.filters && plan.restore.filters.singleSelect || {};
      var instances = _KDB.state.filters.singleSelect.instancesById || {};
      var insert = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, plan.insertSlot || {});
      var diagnostics = [];
      var keys = Object.keys(restore);
      var i;
      if (insert.status !== "ok") {
        return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.SCOPE_TARGET_UNVERIFIED, "restore insert scope is unverified")] };
      }
      for (i = 0; i < keys.length; i += 1) {
        if (_support.isStaleRun(_runtime, _payload)) {
          return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.TAB_MUTATION_CANCELLED, "tab mutation run superseded before restore write")] };
        }
        var sourceSnapshot = restore[keys[i]];
        var targetMatch = matchBySemanticKey(instances, insert.scopeId, sourceSnapshot);
        if (!sourceSnapshot || targetMatch.status !== "ok") {
          diagnostics.push(_support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, "semantic restore target " + (targetMatch.status || "missing"), sourceSnapshot));
          continue;
        }
        var targetId = targetMatch.instance.filterInstanceId;
        if (_overlays[targetId]) {
          diagnostics.push(_support.diagnostic(_config.errorCodes.IDENTITY_COLLISION, "target instance selected more than once", targetMatch.instance));
          continue;
        }
        var written = await _hostFilterIo.writeInstanceSelection(_KDB, _runtime, targetId, sourceSnapshot.hostValues);
        if (_support.isStaleRun(_runtime, _payload)) {
          diagnostics.push(_support.diagnostic(_config.errorCodes.TAB_MUTATION_CANCELLED, "tab mutation run superseded during restore write", targetMatch.instance));
          break;
        }
        if (!written.ok) {
          diagnostics.push(_support.diagnostic(written.errorCode, "restore host write verification failed", targetMatch.instance));
          continue;
        }
        _overlays[targetId] = sourceSnapshot;
      }
      return { ok: diagnostics.length === 0, scopeId: insert.scopeId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.applyTabMutationRestoreDeleted] failed", error);
      return { ok: false, diagnostics: [_support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, String(error && error.message ? error.message : error))] };
    }
  }

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

  async function run(_ctx, _payload) {
    var KDB = _ctx._KDB;
    var runtime = _ctx.runtime;
    var payload = _payload;
    var diagnostics = [];
    var appliedScopes = [];
    var clearedScopes = [];
    try {
      var snapshot = _tabMutation.readRunSnapshot(runtime, payload);
      if (!snapshot) {
        return _tabMutation.applyFailure(payload.operationId, [], [], [
          _support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, "prepare snapshot missing")
        ]);
      }
      var work = _transfers.buildTabMutationTransfers(payload.plan);
      var overlays = {};
      var clearedIds = {};
      for (var c = 0; c < work.clearSlots.length; c += 1) {
        var cleared = await clearScope(KDB, runtime, payload, work.clearSlots[c], clearedIds);
        diagnostics = diagnostics.concat(cleared.diagnostics);
        if (_support.isStaleRun(runtime, payload)) {
          return _support.cancelled("tab mutation apply superseded during clear");
        }
        if (cleared.scopeId && clearedScopes.indexOf(cleared.scopeId) === -1) { clearedScopes.push(cleared.scopeId); }
      }
      for (var i = 0; i < work.transfers.length; i += 1) {
        var transfer = await applyTransfer(KDB, runtime, payload, snapshot, work.transfers[i], overlays);
        diagnostics = diagnostics.concat(transfer.diagnostics);
        if (_support.isStaleRun(runtime, payload)) {
          return _support.cancelled("tab mutation apply superseded during transfer");
        }
        if (transfer.scopeId && appliedScopes.indexOf(transfer.scopeId) === -1) { appliedScopes.push(transfer.scopeId); }
      }
      if (payload.plan && payload.plan.operation === "restoreDeleted") {
        var restored = await writeRestoreSlice(KDB, runtime, payload, overlays);
        diagnostics = diagnostics.concat(restored.diagnostics);
        if (_support.isStaleRun(runtime, payload)) {
          return _support.cancelled("tab mutation apply superseded during restore");
        }
        if (restored.scopeId && appliedScopes.indexOf(restored.scopeId) === -1) { appliedScopes.push(restored.scopeId); }
      }
      if (diagnostics.length > 0) {
        return _tabMutation.applyFailure(payload.operationId, appliedScopes, clearedScopes, diagnostics);
      }
      var reconciled = await _reconcileInventory.reconcileFilterInstances(KDB, runtime, { reason: "tabMutation", runId: payload.runId });
      if (!reconciled.ok || runtime.tabMutationRunId !== payload.runId) {
        return _support.cancelled("tab mutation reconcile failed or was superseded");
      }
      var root = KDB.state.filters.singleSelect;
      Object.keys(clearedIds).forEach(function (_id) {
        applyOverlay(root, _id, {
          currentSelection: { displayValue: _config.ALLE, useValue: "", displaySource: "policy" },
          backupSelection: { displayValue: _config.ALLE, useValue: "", displaySource: "policy" },
          pendingSelection: { displayValue: _config.ALLE }
        });
      });
      Object.keys(overlays).forEach(function (_id) { applyOverlay(root, _id, overlays[_id]); });
      return _tabMutation.applySuccess(payload.operationId, appliedScopes, clearedScopes, reconciled.diagnostics);
    } catch (error) {
      console.error("[singleSelect.applyTabMutation] failed", { operationId: payload.operationId }, error);
      diagnostics.push(_support.diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, _tabMutation.errorMessage(error)));
      return _tabMutation.applyFailure(payload.operationId, appliedScopes, clearedScopes, diagnostics);
    }
  }

  var apply = _tabMutation.createApply(_support.tabMutationBase, {
    rejected: function (_guard) { return _guard; },
    run: run
  });

  function applyTabMutation(_KDB, _runtime, _payload) {
    return apply({ _KDB: _KDB, runtime: _runtime }, _payload);
  }

  return { applyTabMutation: applyTabMutation };
});
