define([], function () {
  "use strict";

  function __controller(_tablesConfig) {
    const tablesConfig = _tablesConfig || {};
    const inputs = [];
    const keys = Object.keys(tablesConfig);
    for (let index = 0; index < keys.length; index += 1) {
      appendLoadInput(inputs, keys[index], tablesConfig[keys[index]]);
    }
    return inputs;
  }

  function appendLoadInput(inputs, tableKey, entry) {
    if (entry && entry.load === true) {
      inputs.push({
        tableName: tableKey,
        title: entry.name,
        role: entry.role,
        isCoreTable: true,
        shape: entry.shape,
        pick: entry.pick,
      });
    }
  }

  return __controller;
});
