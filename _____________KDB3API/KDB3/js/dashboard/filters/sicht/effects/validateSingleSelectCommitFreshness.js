define([
  "./readSingleSelectInventoryGeneration.js",
  "./isDelegatedSichtCommitSource.js"
], function (_readInventoryGeneration, _isDelegatedSource) {
  "use strict";

  function validateSingleSelectCommitFreshness(_KDB, _payload, _operationEntry) {
    try {
      var payload = _payload || {};
      var state = _KDB && _KDB.state && _KDB.state.filters
        ? _KDB.state.filters.sicht : null;
      var timestamp = payload.timestamp != null
        ? Number(payload.timestamp) : Number(payload.observedAt);
      var lastCommittedAt = state && state.meta
        ? Number(state.meta.lastCommittedAt) : 0;
      if (!isFinite(timestamp) ||
        (lastCommittedAt && timestamp < lastCommittedAt)) {
        return "callback timestamp predates the current confirmed Sicht state";
      }
      if (!_operationEntry) {
        return _isDelegatedSource(payload.source)
          ? "delegated callback has no pending Sicht operation"
          : null;
      }
      if (_operationEntry.status !== "pending" ||
        _operationEntry.filterInstanceId !== payload.filterInstanceId ||
        _operationEntry.source !== payload.source ||
        timestamp < Number(_operationEntry.startedAt || 0)) {
        return "callback does not match the pending delegated Sicht operation";
      }
      if (_operationEntry.inventoryGeneration != null &&
        Number(_readInventoryGeneration(_KDB)) !==
          Number(_operationEntry.inventoryGeneration)) {
        return "singleSelect inventoryGeneration changed during delegated commit";
      }
      return null;
    } catch (error) {
      console.error("[sicht.validateSingleSelectCommitFreshness] failed", error);
      throw error;
    }
  }

  return validateSingleSelectCommitFreshness;
});
