define([
  "./buildSpecialTableDataInputs.js",
  "../config/actions.js",
  "../../../../core/services/tableData/events/eventNames.js"
], function (_buildSpecialTableDataInputs, _actions, _eventNames) {
  "use strict";

  function subscribeTableDataChanges(_KDB, _api) {
    var events = _KDB && _KDB.events;
    if (!events || typeof events.subscribe !== "function") {
      return null;
    }
    if (!_api || typeof _api.dispatch !== "function") {
      return null;
    }

    return events.subscribe(_eventNames.LOAD_FINISHED, function (_payload) {
      try {
        var tableName = _payload && _payload.tableName;
        var rowCount = _payload && _payload.rowCount;
        if (!_buildSpecialTableDataInputs.isRelevantTableName(_KDB, tableName)) {
          return;
        }
        _api.dispatch({
          type: _actions.TABLE_DATA_CHANGED,
          payload: { tableName: tableName, rowCount: rowCount }
        });
      } catch (_error) {
        console.error("[specialSingleSelect.tableDataChanged] failed", _error);
      }
    });
  }

  return subscribeTableDataChanges;
});
