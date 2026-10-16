define([
  "./write/clearAllSlots.js",
  "./write/addDataItemsToSlot.js",
  "./write/setTopBottomOnSlot.js",
  "./write/sortDataItemInSlot.js",
  "./write/setCustomLabelInSlot.js"
], function (_clearAllSlots, _addDataItemsToSlot, _setTopBottomOnSlot, _sortDataItemInSlot, _setCustomLabelInSlot) {
  "use strict";

  function __controller(_ctx) {
    return {
      clearAllSlots: _clearAllSlots.bind(null, _ctx),
      addDataItemsToSlot: _addDataItemsToSlot.bind(null, _ctx),
      setTopBottomOnSlot: _setTopBottomOnSlot.bind(null, _ctx),
      sortDataItemInSlot: _sortDataItemInSlot.bind(null, _ctx),
      setCustomLabelInSlot: _setCustomLabelInSlot.bind(null, _ctx)
    };
  }

  return __controller;
});
