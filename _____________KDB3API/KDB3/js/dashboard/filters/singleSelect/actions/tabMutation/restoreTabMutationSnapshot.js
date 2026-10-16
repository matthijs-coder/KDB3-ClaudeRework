define([
  "./guardTabMutation.js",
  "./resolveTabMutationSnapshotTarget.js",
  "../../hostFilterIo.js",
  "../../inventory/reconcile.js",
  "../../config.js"
], function (_support, _resolveSnapshotTarget, _hostFilterIo, _reconcileInventory, _config) {
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

  async function __controller(_KDB, _runtime, _payload) {
    var payload = _payload || {};
    var restored = [];
    var restoredByTargetId = {};
    var unrecoverable = [];
    var diagnostics = [];
    try {
      var guard = _support.guardRun(_runtime, payload);
      if (guard) { return guard; }
      var snapshots = _runtime.tabMutationSnapshots || {};
      var snapshot = snapshots[payload.operationId];
      if (!snapshot) {
        return { ok: true, operationId: payload.operationId, restored: [], unrecoverable: [], diagnostics: [] };
      }
      var ids = Object.keys(snapshot.byId || {});
      var instances = _KDB.state.filters.singleSelect.instancesById || {};
      for (var i = 0; i < ids.length; i += 1) {
        if (_support.isStaleRun(_runtime, payload)) {
          return _support.cancelled("tab mutation rollback superseded");
        }
        var target = _resolveSnapshotTarget(instances, snapshot.byId[ids[i]]);
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
          _KDB, _runtime, target.instance.filterInstanceId, snapshot.byId[ids[i]].hostValues
        );
        if (_support.isStaleRun(_runtime, payload)) {
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
        _KDB, _runtime, { reason: "tabMutation", runId: payload.runId }
      );
      if (!reconciled.ok) {
        diagnostics.push({
          code: _config.errorCodes.TAB_MUTATION_ROLLBACK_INCOMPLETE,
          message: "post-rollback inventory reconcile failed"
        });
      }
      var root = _KDB.state.filters.singleSelect;
      restored.forEach(function (_id) {
        restoreStateFields(root.instancesById && root.instancesById[_id], restoredByTargetId[_id]);
      });
      delete snapshots[payload.operationId];
      return {
        ok: unrecoverable.length === 0 && reconciled.ok === true,
        operationId: payload.operationId,
        restored: restored,
        unrecoverable: unrecoverable,
        diagnostics: diagnostics.concat(reconciled.diagnostics || [])
      };
    } catch (error) {
      console.error("[singleSelect.restoreTabMutationSnapshot] failed", {
        operationId: payload.operationId
      }, error);
      return {
        ok: false,
        operationId: payload.operationId,
        restored: restored,
        unrecoverable: unrecoverable,
        diagnostics: diagnostics.concat([{
          code: _config.errorCodes.TAB_MUTATION_ROLLBACK_INCOMPLETE,
          message: String(error && error.message ? error.message : error)
        }])
      };
    }
  }

  return __controller;
});
