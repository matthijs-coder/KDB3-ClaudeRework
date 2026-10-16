define([], function () {
  "use strict";

  // Snapshot ledger of one owner: runtime.<owner>.tabMutationSnapshots[String(operationId)]. The tabs saga releases
  // the same keys after every run (tabs/tabMutation/owners.js), so the key layout is part of that contract.

  function ensureRuntimeKeys(_runtime) {
    _runtime.tabMutationRunId = typeof _runtime.tabMutationRunId === "number" ? _runtime.tabMutationRunId : 0;
    _runtime.tabMutationSnapshots = _runtime.tabMutationSnapshots || {};
    return _runtime;
  }

  function writeSnapshot(_runtime, _operationId, _snapshot) {
    ensureRuntimeKeys(_runtime).tabMutationSnapshots[String(_operationId)] = _snapshot;
  }

  function readSnapshot(_runtime, _operationId) {
    return ensureRuntimeKeys(_runtime).tabMutationSnapshots[String(_operationId)] || null;
  }

  function deleteSnapshot(_runtime, _operationId) {
    delete ensureRuntimeKeys(_runtime).tabMutationSnapshots[String(_operationId)];
  }

  return {
    ensureRuntimeKeys: ensureRuntimeKeys,
    writeSnapshot: writeSnapshot,
    readSnapshot: readSnapshot,
    deleteSnapshot: deleteSnapshot
  };
});
