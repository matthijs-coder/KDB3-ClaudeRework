define([
  "../../schema/errorCodes.js",
  "../../../../../dashboard/filters/singleSelect/state/selectors.js",
], function (_errorCodes, _singleSelectSelectors) {
  "use strict";

  function readSingleSelectCollectionContext(_KDB) {
    const state = _singleSelectSelectors.readSingleSelectState(_KDB) || {};
    const inventory = state.inventory || {};
    const freshness = typeof inventory.freshness === "string" ? inventory.freshness : "stale";
    if (freshness !== "fresh") {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_SINGLESELECT_INVENTORY_STALE,
        "get",
        "singleSelect inventory is not fresh for writeback collection",
        { freshness: freshness, generation: inventory.generation == null ? null : inventory.generation }
      );
    }

    const instances = (_singleSelectSelectors.readFilterInstances(_KDB, {
      status: "active",
      hostStatus: "present",
    }) || []).filter(function (instance) {
      return instance &&
        instance.selectionOwner === "singleSelect" &&
        instance.filterType !== "sicht" &&
        instance.filterType !== "dienststelle";
    }).sort(function (left, right) {
      return String(left.filterInstanceId || "").localeCompare(String(right.filterInstanceId || ""));
    });

    return instances;
  }

  return readSingleSelectCollectionContext;
});
