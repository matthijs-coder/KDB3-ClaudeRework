define([], function () {
  "use strict";

  function normalized(_value) {
    return _value == null ? "" : String(_value).trim().toLowerCase();
  }

  function isTrueish(_value) {
    return _value === true || normalized(_value) === "true" || normalized(_value) === "trueish";
  }

  function hasOwnFlag(_definition, _key) {
    return _definition != null && Object.prototype.hasOwnProperty.call(_definition, _key) &&
      _definition[_key] != null && normalized(_definition[_key]) !== "";
  }

  function __controller(_definitionResult, _itemName, _scopeType) {
    try {
      var name = normalized(_itemName);
      var result = _definitionResult || {};
      var definition = result.definition || null;
      var condition = normalized(definition && definition.condition);
      if (name === "dienststelle" || name === "dienststelle_bw" || name === "dienststelle_dezpv") {
        return { status: "excluded", filterType: "dienststelle", selectionOwner: "dienststelle" };
      }
      if (_scopeType === "global" && name === "sicht") {
        return { status: "supported", filterType: "sicht", selectionOwner: "sicht" };
      }
      if (result.status !== "ok" || !definition) {
        return { status: "unknown", filterType: "unknown", selectionOwner: null };
      }
      if (isTrueish(definition.isHierarchy) || normalized(definition.cascade) === "downstream") {
        return { status: "excluded", filterType: "dienststelle", selectionOwner: "dienststelle" };
      }
      if (condition === "personengruppe" || condition === "dienststellenleitung") {
        return { status: "supported", filterType: "specialSingleSelect", selectionOwner: "singleSelect" };
      }
      if (isTrueish(definition.isSingleSelect)) {
        return { status: "supported", filterType: "singleSelect", selectionOwner: "singleSelect" };
      }
      var hierarchyFlagPresent = hasOwnFlag(definition, "isHierarchy");
      var singleSelectFlagPresent = hasOwnFlag(definition, "isSingleSelect");
      if (!hierarchyFlagPresent && !singleSelectFlagPresent) {
        return { status: "supported", filterType: "singleSelect", selectionOwner: "singleSelect" };
      }
      return { status: "unknown", filterType: "unknown", selectionOwner: null };
    } catch (error) {
      console.error("[singleSelect.classifyFilterInstance] failed", error);
      throw error;
    }
  }

  return __controller;
});
