define([
  "../config.js",
], function (_config) {
  "use strict";

  function slotRawIsActive(_rawValue) {
    if (_rawValue == null) {
      return false;
    }
    if (typeof _rawValue === "string") {
      return _rawValue.trim() !== "";
    }
    if (Array.isArray(_rawValue)) {
      return _rawValue.length > 0;
    }
    if (typeof _rawValue === "object") {
      return Object.keys(_rawValue).length > 0;
    }
    return true;
  }

  function hasHierarchyPolicy(_visTypeConfig, _slotName) {
    var composition = _visTypeConfig && _visTypeConfig.slotComposition;
    var slotPolicy = composition && composition[_slotName];
    return !!(slotPolicy && slotPolicy.hierarchy);
  }

  function collectActiveSlotNames(_visTypeConfig) {
    var active = [];
    var visTypeConfig = _visTypeConfig && typeof _visTypeConfig === "object" ? _visTypeConfig : {};
    for (var index = 0; index < _config.ALL_SLOT_NAMES.length; index += 1) {
      var slotName = _config.ALL_SLOT_NAMES[index];
      if (slotRawIsActive(visTypeConfig[slotName]) || hasHierarchyPolicy(visTypeConfig, slotName)) {
        active.push(slotName);
      }
    }
    var affects = visTypeConfig.dimensionSelectionAffects;
    if (typeof affects === "string" && affects && active.indexOf(affects) < 0 && _config.ALL_SLOT_NAMES.indexOf(affects) >= 0) {
      active.push(affects);
    }
    return active;
  }

  return {
    collectActiveSlotNames: collectActiveSlotNames,
  };
});
