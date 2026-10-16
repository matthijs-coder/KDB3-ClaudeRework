define(["../input/resolveTableKey.js"], function (_resolveTableKey) {
  "use strict";

  function readTableEntry(_KDB, _input) {
    const tableKey = _resolveTableKey(_input);
    return tableKey && _KDB.state && _KDB.state.tableData ? _KDB.state.tableData[tableKey] : undefined;
  }

  return readTableEntry;
});
