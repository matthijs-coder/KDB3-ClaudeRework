define(["../config/dienststelleDefinitions.js"], function (_definitions) {
  "use strict";

  function abortPreviousHierarchyWarmup(_KDB, _definition) {
    try {
      var nextKey = _definition && _definition.hierarchyTableKey
        ? String(_definition.hierarchyTableKey)
        : "";
      var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
      var keys;
      var abortPromise;
      if (!nextKey || !tableData || typeof tableData.abortTable !== "function") {
        return;
      }
      keys = collectInactiveHierarchyKeys(_KDB, nextKey);
      if (!keys.length) {
        return;
      }
      abortPromise = tableData.abortTable(keys.map(toTableInput));
      if (abortPromise && typeof abortPromise.catch === "function") {
        abortPromise.catch(onAbortTableRejected);
      }
    } catch (err) {
      console.error("[dienststelle.abortPreviousHierarchyWarmup] failed", err);
    }
  }

  function collectInactiveHierarchyKeys(_KDB, _nextKey) {
    var keys = [];
    var seen = {};
    appendKey(keys, seen, readPreviousHierarchyKey(_KDB), _nextKey);
    Object.keys(_definitions || {}).forEach(function (sichtKey) {
      var entry = _definitions[sichtKey];
      appendKey(keys, seen, entry && entry.hierarchyTableKey, _nextKey);
    });
    return keys;
  }

  function readPreviousHierarchyKey(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters
      ? _KDB.state.filters.dienststelle
      : null;
    return state && state.activeHierarchyTableKey
      ? String(state.activeHierarchyTableKey)
      : "";
  }

  function appendKey(_keys, _seen, _key, _nextKey) {
    var key = _key ? String(_key) : "";
    if (!key || key === _nextKey || _seen[key]) {
      return;
    }
    _seen[key] = true;
    _keys.push(key);
  }

  function toTableInput(_key) {
    return { tableName: _key };
  }

  function onAbortTableRejected(_err) {
    console.error("[dienststelle.abortPreviousHierarchyWarmup] abortTable rejected", _err);
  }

  return abortPreviousHierarchyWarmup;
});
