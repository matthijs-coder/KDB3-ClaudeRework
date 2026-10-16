define([
  "../config/tabMutationOwners.js",
  "../../../core/utils/filters/tabMutationRun/tabMutationSnapshots.js"
], function (_tabMutationOwners, _snapshots) {
  "use strict";

  function clearTabMutationSnapshots(_KDB, _operationId) {
    try {
      var runtime = _KDB && _KDB.runtime;
      if (!runtime || _operationId == null || _operationId === "") { return; }
      _tabMutationOwners.SNAPSHOT_OWNER_KEYS.forEach(function (ownerKey) {
        clearOwnerSnapshot(runtime[ownerKey], _operationId, ownerKey);
      });
    } catch (err) {
      console.error("[tabs.clearTabMutationSnapshots] failed", { operationId: _operationId }, err);
    }
  }

  function clearOwnerSnapshot(_ownerRuntime, _operationId, _ownerKey) {
    try {
      if (!_ownerRuntime) { return; }
      _snapshots.deleteSnapshot(_ownerRuntime, _operationId);
    } catch (err) {
      console.error("[tabs.clearTabMutationSnapshots] owner failed", {
        owner: _ownerKey,
        operationId: _operationId
      }, err);
    }
  }

  return clearTabMutationSnapshots;
});
