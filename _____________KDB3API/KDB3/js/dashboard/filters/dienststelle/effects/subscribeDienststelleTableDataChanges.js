define([
  "../config/buildDienststelleTableDataInputs.js",
  "../config/actions.js",
  "../../../../core/services/tableData/events/eventNames.js"
], function (_buildDienststelleTableDataInputs, _actions, _eventNames) {
  "use strict";

  function onTableDataLoadFinished(_KDB, _api, _payload) {
    try {
      var tableName = _payload && _payload.tableName;
      var rowCount = _payload && _payload.rowCount;
      if (!_buildDienststelleTableDataInputs.isRelevantTableName(_KDB, tableName)) {
        return;
      }
      _api.dispatch({
        type: _actions.TABLE_DATA_CHANGED,
        payload: { tableName: tableName, rowCount: rowCount, source: "tableData" }
      });
    } catch (_error) {
      console.error("[dienststelle.tableDataChanged] failed", _error);
    }
  }

  function subscribeDienststelleTableDataChanges(_KDB, _api) {
    var events = _KDB && _KDB.events;
    if (!events || typeof events.subscribe !== "function") {
      return null;
    }
    if (!_api || typeof _api.dispatch !== "function") {
      return null;
    }

    return events.subscribe(
      _eventNames.LOAD_FINISHED,
      onTableDataLoadFinished.bind(null, _KDB, _api)
    );
  }

  return subscribeDienststelleTableDataChanges;
});
