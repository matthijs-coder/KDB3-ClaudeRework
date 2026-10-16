define([
  "./guard.js",
  "../hostFilterIo.js",
  "../inventory/reconcile.js",
  "../config.js",
  "../../_core/tabMutation.js"
], function (_support, _hostFilterIo, _reconcileInventory, _config, _tabMutation) {
  "use strict";

  function restoreStateFields(_record, _snapshotRecord) {
    if (!_record || !_snapshotRecord) { return; }
    _record.currentSelection = _snapshotRecord.currentSelection
      ? Object.assign({}, _snapshotRecord.currentSelection) : null;
    _record.backupSelection = _snapshotRecord.backupSelection
      ? Object.assign({}, _snapshotRecord.backupSelection) : null;
    _record.pendingSelection = _snapshotRecord.pendingSelection
      ? Object.assign({}, _snapshotRecord.pendingSelection) : null;
  }

  async function run(_ctx, _payload, _snapshot) {
    var KDB = _ctx._KDB;
    var runtime = _ctx.runtime;
    var payload = _payload;
    var snapshot = _snapshot;
    var restored = [];
    var restoredByTargetId = {};
    var unrecoverable = [];
    var diagnostics = [];
    try {
      var ids = Object.keys(snapshot.byId || {});
      var instances = KDB.state.filters.singleSelect.instancesById || {};
      for (var i = 0; i < ids.length; i += 1) {
        if (_support.isStaleRun(runtime, payload)) {
          return _support.cancelled("tab mutation rollback superseded");
        }
        var target = _support.matchSnapshotTarget(instances, snapshot.byId[ids[i]]);
        if (target.status !== "ok") {
          unrecoverable.push(ids[i]);
          diagnostics.push({
            code: _config.errorCodes.TAB_MUTATION_ROLLBACK_INCOMPLETE,
            filterInstanceId: ids[i],
            message: "snapshot rollback target " + target.status
          });
          continue;
        }
        var written = await _hostFilterIo.writeInstanceSelection(
          KDB, runtime, target.instance.filterInstanceId, snapshot.byId[ids[i]].hostValues
        );
        if (_support.isStaleRun(runtime, payload)) {
          return _support.cancelled("tab mutation rollback superseded during host restore");
        }
        if (written.ok) {
          restored.push(target.instance.filterInstanceId);
          restoredByTargetId[target.instance.filterInstanceId] = snapshot.byId[ids[i]];
        } else {
          unrecoverable.push(target.instance.filterInstanceId);
          diagnostics.push({
            code: _config.errorCodes.TAB_MUTATION_ROLLBACK_INCOMPLETE,
            filterInstanceId: target.instance.filterInstanceId,
            message: "snapshot host pair could not be restored: " + written.errorCode
          });
        }
      }
      var reconciled = await _reconcileInventory.reconcileFilterInstances(
        KDB, runtime, { reason: "tabMutation", runId: payload.runId }
      );
      if (!reconciled.ok) {
        diagnostics.push({
          code: _config.errorCodes.TAB_MUTATION_ROLLBACK_INCOMPLETE,
          message: "post-rollback inventory reconcile failed"
        });
      }
      var root = KDB.state.filters.singleSelect;
      restored.forEach(function (_id) {
        restoreStateFields(root.instancesById && root.instancesById[_id], restoredByTargetId[_id]);
      });
      return _tabMutation.restoreResult(
        unrecoverable.length === 0 && reconciled.ok === true,
        payload.operationId,
        restored,
        unrecoverable,
        diagnostics.concat(reconciled.diagnostics || [])
      );
    } catch (error) {
      console.error("[singleSelect.restoreTabMutationSnapshot] failed", { operationId: payload.operationId }, error);
      return _tabMutation.restoreResult(false, payload.operationId, restored, unrecoverable, diagnostics.concat([{
        code: _config.errorCodes.TAB_MUTATION_ROLLBACK_INCOMPLETE,
        message: _tabMutation.errorMessage(error)
      }]));
    }
  }

  var restore = _tabMutation.createRestore(_support.tabMutationBase, {
    release: "always",
    rejected: function (_guard) { return _guard; },
    run: run
  });

  function restoreTabMutationSnapshot(_KDB, _runtime, _payload) {
    return restore({ _KDB: _KDB, runtime: _runtime }, _payload);
  }

  return { restoreTabMutationSnapshot: restoreTabMutationSnapshot };
});
