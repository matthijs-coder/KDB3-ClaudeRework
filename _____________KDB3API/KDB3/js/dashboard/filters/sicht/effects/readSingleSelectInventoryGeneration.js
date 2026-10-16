define([
  "../../singleSelect/state/selectors.js"
], function (_singleSelectSelectors) {
  "use strict";

  function readSingleSelectInventoryGeneration(_KDB) {
    try {
      if (typeof _singleSelectSelectors.readInventoryGeneration === "function") {
        return _singleSelectSelectors.readInventoryGeneration(_KDB);
      }
      var state = _singleSelectSelectors.readSingleSelectState(_KDB);
      return state && state.inventory ? state.inventory.generation : null;
    } catch (error) {
      console.error("[sicht.readSingleSelectInventoryGeneration] failed", error);
      throw error;
    }
  }

  return readSingleSelectInventoryGeneration;
});
