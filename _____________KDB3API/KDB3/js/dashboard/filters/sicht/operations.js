define([], function () {
  "use strict";

  // Delegated owner-selection operations: id generation and the registry of
  // pending/committing/committed operations in _KDB.runtime.sicht.delegatedOperationIds.
  var operationCounter = 0;

  function buildSichtOperationId(_source) {
    operationCounter += 1;
    return "sicht:" + (_source || "op") + ":" + Date.now() + ":" + operationCounter;
  }

  function readOperationRegistry(_runtime) {
    _runtime.delegatedOperationIds = _runtime.delegatedOperationIds || {};
    return _runtime.delegatedOperationIds;
  }

  function trimOperationRegistry(_registry) {
    var keys = Object.keys(_registry);
    if (keys.length > 100) {
      delete _registry[keys[0]];
    }
  }

  function registerOperation(_runtime, _payload) {
    var payload = _payload || {};
    var operationId = payload.operationId ? String(payload.operationId) : "";
    var registry = readOperationRegistry(_runtime);
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
    trimOperationRegistry(registry);
    return true;
  }

  function inspectOperation(_runtime, _operationId) {
    var operationId = _operationId ? String(_operationId) : "";
    var entry = operationId ? readOperationRegistry(_runtime)[operationId] : null;
    return {
      operationId: operationId,
      entry: entry || null,
      isDuplicate: !!(entry &&
        (entry.status === "committed" || entry.status === "committing")),
      isInFlight: !!(entry && entry.status === "committing")
    };
  }

  function beginOperationCommit(_runtime, _payload) {
    var payload = _payload || {};
    var operationId = payload.operationId ? String(payload.operationId) : "";
    var registry = readOperationRegistry(_runtime);
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
    trimOperationRegistry(registry);
    return true;
  }

  function markOperationCommitted(_runtime, _operationId, _filterInstanceId) {
    if (!_operationId) {
      return false;
    }
    var registry = readOperationRegistry(_runtime);
    var entry = registry[_operationId] || {};
    registry[_operationId] = Object.assign({}, entry, {
      status: "committed",
      filterInstanceId: _filterInstanceId || entry.filterInstanceId || null,
      committedAt: Date.now()
    });
    trimOperationRegistry(registry);
    return true;
  }

  function abandonOperation(_runtime, _operationId) {
    var registry = readOperationRegistry(_runtime);
    if (registry[_operationId] &&
      registry[_operationId].status !== "committed") {
      delete registry[_operationId];
    }
  }

  return {
    buildSichtOperationId: buildSichtOperationId,
    registerOperation: registerOperation,
    inspectOperation: inspectOperation,
    beginOperationCommit: beginOperationCommit,
    markOperationCommitted: markOperationCommitted,
    abandonOperation: abandonOperation
  };
});
