define([], function () {
  "use strict";

  var TABLE_KEYS = [
    "sicht_bw",
    "sicht_dezpv",
    "dienststelle_bw_default",
    "dienststelle_dezpv_default"
  ];

  function normalizeMatchValue(_value) {
    return String(_value == null ? "" : _value).trim().toLowerCase();
  }

  function buildRelevantNameSet(_KDB) {
    var relevantNames = {};
    var idx;
    var tableKey;
    var tableConfig;
    for (idx = 0; idx < TABLE_KEYS.length; idx += 1) {
      tableKey = TABLE_KEYS[idx];
      relevantNames[normalizeMatchValue(tableKey)] = true;
      tableConfig =
        _KDB && _KDB.config && _KDB.config.tables ? _KDB.config.tables[tableKey] : null;
      if (tableConfig && tableConfig.name) {
        relevantNames[normalizeMatchValue(tableConfig.name)] = true;
      }
    }
    return relevantNames;
  }

  function isRelevantTableName(_KDB, _tableName) {
    if (!_tableName) {
      return false;
    }
    return buildRelevantNameSet(_KDB)[normalizeMatchValue(_tableName)] === true;
  }

  return {
    tableKeys: TABLE_KEYS.slice(),
    isRelevantTableName: isRelevantTableName
  };
});
