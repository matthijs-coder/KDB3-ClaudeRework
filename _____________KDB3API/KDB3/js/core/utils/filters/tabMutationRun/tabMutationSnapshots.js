define([], function () {
  "use strict";

  function ensureRuntimeKeys(_runtime) {
    try {
      _runtime.tabMutationRunId = typeof _runtime.tabMutationRunId === "number" ? _runtime.tabMutationRunId : 0;
      _runtime.tabMutationSnapshots = _runtime.tabMutationSnapshots || {};
      return _runtime;
    } catch (error) {
      console.error("[tabMutationRun.ensureRuntimeKeys] failed", error);
      throw error;
    }
  }

  function writeSnapshot(_runtime, _operationId, _snapshot) {
    try {
      ensureRuntimeKeys(_runtime).tabMutationSnapshots[String(_operationId)] = _snapshot;
    } catch (error) {
      console.error("[tabMutationRun.writeSnapshot] failed", error);
      throw error;
    }
  }

  function readSnapshot(_runtime, _operationId) {
    try {
      return ensureRuntimeKeys(_runtime).tabMutationSnapshots[String(_operationId)] || null;
    } catch (error) {
      console.error("[tabMutationRun.readSnapshot] failed", error);
      throw error;
    }
  }

  function deleteSnapshot(_runtime, _operationId) {
    try {
      delete ensureRuntimeKeys(_runtime).tabMutationSnapshots[String(_operationId)];
    } catch (error) {
      console.error("[tabMutationRun.deleteSnapshot] failed", error);
      throw error;
    }
  }

  return {
    ensureRuntimeKeys: ensureRuntimeKeys,
    writeSnapshot: writeSnapshot,
    readSnapshot: readSnapshot,
    deleteSnapshot: deleteSnapshot
  };
});
