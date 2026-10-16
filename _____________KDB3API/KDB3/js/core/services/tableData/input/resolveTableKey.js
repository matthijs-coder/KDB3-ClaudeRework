define([], function () {
  "use strict";

  function resolveTableKey(_input) {
    const input = _input || {};
    return input.tableHandle || input.tableName;
  }

  return resolveTableKey;
});
