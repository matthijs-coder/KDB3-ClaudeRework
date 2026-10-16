/*
 * Filter owner kit: which owner acts on a configured filter.
 *
 * classifyInventory(definitionResult, itemName, scopeType)   the singleSelect inventory classification (see below)
 * isClaimedByNativeMultiSelect(definitionResult, itemName)    the native claim (see below)
 * classifyOwners({ itemName, scopeType, definitionResult }) ->
 *   { inventory: { status, filterType, selectionOwner }, claimedByNativeMultiSelect, owners }
 *     inventory                    the singleSelect inventory classification: status "supported" | "excluded" | "unknown";
 *                                  filterType "sicht" | "dienststelle" | "specialSingleSelect" | "singleSelect" | "unknown";
 *                                  selectionOwner "sicht" | "dienststelle" | "singleSelect" | null
 *     claimedByNativeMultiSelect   true when nativeMultiSelect owns the filter. The caller applies its descriptor
 *                                  preconditions (item id, scope) before asking; the name prefix rule is part of this policy.
 *     owners                       every owner that acts: the inventory filterType unless status is "unknown", plus
 *                                  "nativeMultiSelect" when claimed
 *   definitionResult is the result of filterDefinitions.readDefinition.
 *
 * The inventory rules and the native claim are two views of one decision table, reproduced exactly. They overlap in
 * two baseline cases that are deliberately kept (the owners above list both): a definition with isNative and neither
 * isHierarchy nor isSingleSelect flag, and the global Sicht without a definition.
 */
define([
  "./filterDefinitions.js"
], function (_definitions) {
  "use strict";

  var DIENSTSTELLE_NAMES = ["dienststelle", "dienststelle_bw", "dienststelle_dezpv"];
  var SPECIAL_CONDITIONS = ["personengruppe", "dienststellenleitung"];

  function classifyInventory(_definitionResult, _itemName, _scopeType) {
    var name = _definitions.normalizeLower(_itemName);
    var result = _definitionResult || {};
    var definition = result.definition || null;
    var condition = _definitions.normalizeLower(definition && definition.condition);
    if (DIENSTSTELLE_NAMES.indexOf(name) !== -1) {
      return { status: "excluded", filterType: "dienststelle", selectionOwner: "dienststelle" };
    }
    if (_scopeType === "global" && name === "sicht") {
      return { status: "supported", filterType: "sicht", selectionOwner: "sicht" };
    }
    if (result.status !== "ok" || !definition) {
      return { status: "unknown", filterType: "unknown", selectionOwner: null };
    }
    if (_definitions.isTrueish(definition.isHierarchy) || _definitions.normalizeLower(definition.cascade) === "downstream") {
      return { status: "excluded", filterType: "dienststelle", selectionOwner: "dienststelle" };
    }
    if (SPECIAL_CONDITIONS.indexOf(condition) !== -1) {
      return { status: "supported", filterType: "specialSingleSelect", selectionOwner: "singleSelect" };
    }
    if (_definitions.isTrueish(definition.isSingleSelect)) {
      return { status: "supported", filterType: "singleSelect", selectionOwner: "singleSelect" };
    }
    if (!_definitions.hasOwnFlag(definition, "isHierarchy") && !_definitions.hasOwnFlag(definition, "isSingleSelect")) {
      return { status: "supported", filterType: "singleSelect", selectionOwner: "singleSelect" };
    }
    return { status: "unknown", filterType: "unknown", selectionOwner: null };
  }

  function isClaimedByNativeMultiSelect(_definitionResult, _itemName) {
    var definition = _definitionResult && _definitionResult.definition;
    var condition;
    if (_definitions.normalizeLower(_itemName).indexOf("dienststelle") === 0) { return false; }
    if (!_definitionResult || _definitionResult.status !== "ok" || !definition) { return true; }
    condition = _definitions.normalizeLower(definition.condition);
    if (_definitions.isTrueish(definition.isHierarchy) || _definitions.normalizeLower(definition.cascade) === "downstream") {
      return false;
    }
    if (SPECIAL_CONDITIONS.indexOf(condition) !== -1) { return false; }
    if (_definitions.isTrueish(definition.isSingleSelect)) { return false; }
    if (_definitions.isTrueish(definition.isNative)) { return true; }
    if (!_definitions.hasOwnFlag(definition, "isHierarchy") && !_definitions.hasOwnFlag(definition, "isSingleSelect")) {
      return false;
    }
    return true;
  }

  function classifyOwners(_input) {
    var input = _input || {};
    var inventory = classifyInventory(input.definitionResult, input.itemName, input.scopeType);
    var claimed = isClaimedByNativeMultiSelect(input.definitionResult, input.itemName);
    var owners = [];
    if (inventory.status !== "unknown") { owners.push(inventory.filterType); }
    if (claimed) { owners.push("nativeMultiSelect"); }
    return { inventory: inventory, claimedByNativeMultiSelect: claimed, owners: owners };
  }

  return {
    classifyInventory: classifyInventory,
    isClaimedByNativeMultiSelect: isClaimedByNativeMultiSelect,
    classifyOwners: classifyOwners
  };
});
