define([
  "../../_core/filterDefinitions.js",
  "../../_core/ownerPolicy.js"
], function (_kitDefinitions, _ownerPolicy) {
  "use strict";

  function definitionOptions(_source) {
    return Object.assign({ source: _source }, _kitDefinitions.SINGLE_SELECT_DEFINITION_OPTIONS);
  }

  // Reconcile reads one definition per host item. The index groups every source's filterInstances
  // by scopeType and item name once, so readFilterDefinition(..., index) does not rescan them.
  function createDefinitionIndex(_KDB, _source) {
    return _kitDefinitions.createDefinitionIndex(_KDB, definitionOptions(_source));
  }

  function readFilterDefinition(_KDB, _source, _scopeType, _itemName, _itemId, _index) {
    return _kitDefinitions.readDefinition(_KDB, _scopeType, _itemName, _itemId, _index, definitionOptions(_source));
  }

  function classifyFilterInstance(_definitionResult, _itemName, _scopeType) {
    return _ownerPolicy.classifyInventory(_definitionResult, _itemName, _scopeType);
  }

  return {
    createDefinitionIndex: createDefinitionIndex,
    readFilterDefinition: readFilterDefinition,
    classifyFilterInstance: classifyFilterInstance
  };
});
