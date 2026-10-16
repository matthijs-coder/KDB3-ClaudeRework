define([], function () {
  "use strict";

  function readSpecialSingleSelectState(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.specialSingleSelect : null;
    if (!state || state.lifecycle === "disposed") {
      return undefined;
    }
    return state;
  }

  function readSpecialFilterEntry(_KDB, _filterId) {
    var state = readSpecialSingleSelectState(_KDB);
    return state && _filterId ? state.byFilterId[_filterId] : undefined;
  }

  return {
    readSpecialSingleSelectState: readSpecialSingleSelectState,
    readSpecialFilterEntry: readSpecialFilterEntry
  };
});
