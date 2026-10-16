define([
  "./input/normalizeTableInputs.js",
  "./operations/readRowsInputs.js",
  "./operations/readPendingLoadInputs.js",
  "./operations/readTableStateInputs.js"
], function (_normalizeTableInputs, _readRowsInputs, _readPendingLoadInputs, _readTableStateInputs) {
  "use strict";

  function createTableDataReadApi(_KDB, _life) {
    return {
      readRows: readRows.bind(null, _KDB, _life),
      readPendingLoad: readPendingLoad.bind(null, _KDB, _life),
      readTableState: readTableState.bind(null, _KDB, _life)
    };
  }

  function readAllTableState(_KDB) {
    return _KDB.state && _KDB.state.tableData ? _KDB.state.tableData : undefined;
  }

  function readRows(_KDB, _life, _input) {
    if (_life.disposed) {
      return undefined;
    }
    try {
      return _readRowsInputs(_KDB, _normalizeTableInputs(_input));
    } catch (error) {
      console.error("[tableDataService.readRows] public method failed", error);
      return undefined;
    }
  }

  function readPendingLoad(_KDB, _life, _input) {
    if (_life.disposed) {
      return undefined;
    }
    try {
      return _readPendingLoadInputs(_KDB, _normalizeTableInputs(_input));
    } catch (error) {
      console.error("[tableDataService.readPendingLoad] public method failed", error);
      return undefined;
    }
  }

  function readTableState(_KDB, _life, _input) {
    if (_life.disposed) {
      return undefined;
    }
    try {
      return _input == null ? readAllTableState(_KDB) : _readTableStateInputs(_KDB, _normalizeTableInputs(_input));
    } catch (error) {
      console.error("[tableDataService.readTableState] public method failed", error);
      return undefined;
    }
  }

  return createTableDataReadApi;
});
