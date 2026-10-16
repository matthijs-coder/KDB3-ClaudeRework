define([
  "./readClaimDefinition.js",
  "./stripTabpanel.js"
], function (_readClaimDefinition, _stripTabpanel) {
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

  // Ownership policy over a flat descriptor. This is KDB domain logic and stays
  // with the owner: the cognosHost filters facet only translates host items into
  // descriptors, it does not decide which filter belongs to which owner.
  function isUnownedFilterDescriptor(_KDB, _descriptor) {
    try {
      var descriptor = _descriptor || {};
      var itemId = String(descriptor.itemId || "").trim();
      if (!itemId) { return false; }
      var scope = String(descriptor.rawScopeId || "").trim();
      if (!scope) { return false; }
      var scopeType = _stripTabpanel(scope) === "global" ? "global" : "pageContext";
      var itemName = String(descriptor.itemName || "");
      if (normalized(itemName).indexOf("dienststelle") === 0) { return false; }
      var definitionResult = _readClaimDefinition(_KDB, scopeType, itemName, itemId);
      if (definitionResult.status !== "ok" || !definitionResult.definition) { return true; }
      var definition = definitionResult.definition;
      if (isTrueish(definition.isHierarchy) || normalized(definition.cascade) === "downstream") { return false; }
      if (normalized(definition.condition) === "personengruppe" || normalized(definition.condition) === "dienststellenleitung") { return false; }
      if (isTrueish(definition.isSingleSelect)) { return false; }
      if (isTrueish(definition.isNative)) { return true; }
      if (!hasOwnFlag(definition, "isHierarchy") && !hasOwnFlag(definition, "isSingleSelect")) { return false; }
      return true;
    } catch (error) {
      console.error("[nativeMultiSelect.isUnownedFilterDescriptor] failed", error);
      return false;
    }
  }

  // The live-item entry point that bridged this policy during the migration is
  // gone: every caller now works on descriptors from the cognosHost filters
  // facet, so keeping it would be untested dead surface.
  return {
    isUnownedFilterDescriptor: isUnownedFilterDescriptor
  };
});
