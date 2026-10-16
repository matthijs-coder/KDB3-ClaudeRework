/*
 * Read facade of singleSelect for the delegating owners (sicht, specialSingleSelect). None of these reads clones the
 * whole owner state, unlike getState() / state/selectors.js readSingleSelectState.
 *
 * readInventoryGeneration(_KDB)      number | null
 * readInventoryStatus(_KDB)          copy of the inventory record ({ generation, freshness, reconciledAt, errorCode }) | null
 * readLiveInstances(_KDB, query)     copies of the instance records (all fields) in id order that match every given
 *                                    key of query: status, hostStatus, filterType, selectionOwner
 * readFilterInstance(_KDB, id)       projected record | null
 * readFilterInstances(_KDB, options) projected records
 */
define([
  "./state/selectors.js",
  "./state/clone.js"
], function (_stateSelectors, _clone) {
  "use strict";

  var QUERY_KEYS = ["status", "hostStatus", "filterType", "selectionOwner"];

  function readOwnerState(_KDB) {
    return _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : undefined;
  }

  function readInventoryStatus(_KDB) {
    var state = readOwnerState(_KDB);
    return state && state.inventory ? Object.assign({}, state.inventory) : null;
  }

  function matchesQuery(_record, _query) {
    return QUERY_KEYS.every(function (_key) {
      return _query[_key] === undefined || _record[_key] === _query[_key];
    });
  }

  function readLiveInstances(_KDB, _query) {
    var state = readOwnerState(_KDB);
    var query = _query || {};
    var byId = (state && state.instancesById) || {};
    return Object.keys(byId).sort().filter(function (_id) {
      return byId[_id] && matchesQuery(byId[_id], query);
    }).map(function (_id) {
      return _clone.cloneInstance(byId[_id]);
    });
  }

  return {
    readInventoryGeneration: _stateSelectors.readInventoryGeneration,
    readInventoryStatus: readInventoryStatus,
    readLiveInstances: readLiveInstances,
    readFilterInstance: _stateSelectors.readFilterInstance,
    readFilterInstances: _stateSelectors.readFilterInstances
  };
});
