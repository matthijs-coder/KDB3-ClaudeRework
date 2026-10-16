define([], function () {
  "use strict";

  function readRegistry(_runtime) {
    _runtime.delegatedOperationIds = _runtime.delegatedOperationIds || {};
    return _runtime.delegatedOperationIds;
  }

  function trimRegistry(_registry) {
    var keys = Object.keys(_registry);
    if (keys.length > 100) {
      delete _registry[keys[0]];
    }
  }

  function register(_runtime, _payload) {
    try {
      var payload = _payload || {};
      var operationId = payload.operationId ? String(payload.operationId) : "";
      var registry = readRegistry(_runtime);
      if (!operationId || registry[operationId]) {
        return false;
      }
      registry[operationId] = {
        status: "pending",
        filterInstanceId: payload.filterInstanceId || null,
        source: payload.source || null,
        operationKind: payload.operationKind || "selection",
        inventoryGeneration: payload.inventoryGeneration,
        selection: payload.selection ? {
          displayValue: payload.selection.displayValue,
          useValue: payload.selection.useValue
        } : null,
        startedAt: Date.now()
      };
      trimRegistry(registry);
      return true;
    } catch (error) {
      console.error("[sicht.claimDelegatedOperationId.register] failed", error);
      return false;
    }
  }

  function inspect(_runtime, _operationId) {
    try {
      var operationId = _operationId ? String(_operationId) : "";
      var entry = operationId ? readRegistry(_runtime)[operationId] : null;
      return {
        operationId: operationId,
        entry: entry || null,
        isDuplicate: !!(entry &&
          (entry.status === "committed" || entry.status === "committing")),
        isInFlight: !!(entry && entry.status === "committing")
      };
    } catch (error) {
      console.error("[sicht.claimDelegatedOperationId.inspect] failed", error);
      return { operationId: "", entry: null, isDuplicate: false };
    }
  }

  function beginCommit(_runtime, _payload) {
    try {
      var payload = _payload || {};
      var operationId = payload.operationId ? String(payload.operationId) : "";
      var registry = readRegistry(_runtime);
      var entry = registry[operationId];
      if (!operationId || (entry &&
        (entry.status === "committing" || entry.status === "committed"))) {
        return false;
      }
      registry[operationId] = Object.assign({}, entry || {}, {
        status: "committing",
        filterInstanceId: payload.filterInstanceId || null,
        source: payload.source || null,
        startedAt: entry && entry.startedAt ? entry.startedAt : Date.now()
      });
      trimRegistry(registry);
      return true;
    } catch (error) {
      console.error("[sicht.claimDelegatedOperationId.beginCommit] failed", error);
      return false;
    }
  }

  function markCommitted(_runtime, _operationId, _filterInstanceId) {
    try {
      if (!_operationId) {
        return false;
      }
      var registry = readRegistry(_runtime);
      var entry = registry[_operationId] || {};
      registry[_operationId] = Object.assign({}, entry, {
        status: "committed",
        filterInstanceId: _filterInstanceId || entry.filterInstanceId || null,
        committedAt: Date.now()
      });
      trimRegistry(registry);
      return true;
    } catch (error) {
      console.error("[sicht.claimDelegatedOperationId.markCommitted] failed", error);
      return false;
    }
  }

  function abandon(_runtime, _operationId) {
    try {
      var registry = readRegistry(_runtime);
      if (registry[_operationId] &&
        registry[_operationId].status !== "committed") {
        delete registry[_operationId];
      }
    } catch (error) {
      console.error("[sicht.claimDelegatedOperationId.abandon] failed", error);
    }
  }

  return {
    register: register,
    inspect: inspect,
    beginCommit: beginCommit,
    markCommitted: markCommitted,
    abandon: abandon
  };
});
