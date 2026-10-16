define([], function () {
  "use strict";

  function getTableConfigObject(_KDB, _tableKey) {
    const tableKey = String(_tableKey || "").trim();
    const tables = _KDB && _KDB.config && _KDB.config.tables;
    const config = tables && tableKey ? tables[tableKey] : null;
    if (!config || typeof config !== "object") {
      return undefined;
    }

    const result = { key: tableKey };
    const keys = Object.keys(config);
    for (let index = 0; index < keys.length; index += 1) {
      result[keys[index]] = config[keys[index]];
    }
    return result;
  }

  return getTableConfigObject;
});
