/*
 * Filter owner kit: the tableData watcher the delegating owners share.
 *
 * createTableNameMatcher(tableKeys) -> isRelevant(_KDB, tableName)
 *     True for the table keys and for the table names configured under _KDB.config.tables[key].name, compared
 *     trimmed and lowercased. The name set is rebuilt per call: configured names can change at runtime.
 * watchTableData(_KDB, spec) -> unsubscribe | null
 *     Replaces runtime.subscriptions.tableDataLoadFinished: calls the previous unsubscribe, subscribes to the
 *     tableData LOAD_FINISHED event and stores the new unsubscribe (null when the event bus is missing).
 *     spec.runtime            owner runtime (needs the `subscriptions` bucket)
 *     spec.isRelevant         (_KDB, tableName) -> boolean
 *     spec.dispatch           (action) -> any, usually the owner's public dispatch
 *     spec.actionType         action type dispatched for a relevant table
 *     spec.buildPayload       optional (tableName, eventPayload) -> payload; default { tableName, rowCount }
 *     spec.failureLabel       optional "<owner>.<what>": errors of the handler are logged, not thrown
 */
define([
  "../../../core/services/tableData/events/eventNames.js"
], function (_tableDataEvents) {
  "use strict";

  function normalizeMatchValue(_value) {
    return String(_value == null ? "" : _value).trim().toLowerCase();
  }

  function createTableNameMatcher(_tableKeys) {
    return function isRelevantTableName(_KDB, _tableName) {
      var relevantNames = {};
      if (!_tableName) {
        return false;
      }
      _tableKeys.forEach(function (_tableKey) {
        var tableConfig = _KDB && _KDB.config && _KDB.config.tables ? _KDB.config.tables[_tableKey] : null;
        relevantNames[normalizeMatchValue(_tableKey)] = true;
        if (tableConfig && tableConfig.name) {
          relevantNames[normalizeMatchValue(tableConfig.name)] = true;
        }
      });
      return relevantNames[normalizeMatchValue(_tableName)] === true;
    };
  }

  function buildDefaultPayload(_tableName, _eventPayload) {
    return { tableName: _tableName, rowCount: _eventPayload && _eventPayload.rowCount };
  }

  function subscribeLoadFinished(_KDB, _spec) {
    var events = _KDB && _KDB.events;
    var buildPayload = _spec.buildPayload || buildDefaultPayload;

    function dispatchRelevantLoad(_payload) {
      var tableName = _payload && _payload.tableName;
      if (!_spec.isRelevant(_KDB, tableName)) {
        return;
      }
      _spec.dispatch({ type: _spec.actionType, payload: buildPayload(tableName, _payload) });
    }

    function handleLoadFinished(_payload) {
      if (!_spec.failureLabel) {
        dispatchRelevantLoad(_payload);
        return;
      }
      try {
        dispatchRelevantLoad(_payload);
      } catch (error) {
        console.error("[" + _spec.failureLabel + "] failed", error);
      }
    }

    if (!events || typeof events.subscribe !== "function") {
      return null;
    }
    return events.subscribe(_tableDataEvents.LOAD_FINISHED, handleLoadFinished);
  }

  function watchTableData(_KDB, _spec) {
    var subscriptions = _spec.runtime.subscriptions;
    if (typeof subscriptions.tableDataLoadFinished === "function") {
      subscriptions.tableDataLoadFinished();
    }
    subscriptions.tableDataLoadFinished = subscribeLoadFinished(_KDB, _spec);
    return subscriptions.tableDataLoadFinished;
  }

  return {
    createTableNameMatcher: createTableNameMatcher,
    watchTableData: watchTableData
  };
});
