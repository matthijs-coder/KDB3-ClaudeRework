define([
  "./config/getObjectPropertyDefinitions.js",
  "./readPropertyValue.js",
  "./parsePropertyInput.js"
], function (_getObjectPropertyDefinitions, _readPropertyValue, _parsePropertyInput) {
  "use strict";

  function loadObjectProperty(_KDB, properties, definition) {
    try {
      const rawInput = _readPropertyValue(_KDB, definition.propertyId);
      const parsedValue = _parsePropertyInput(definition.propertyId, rawInput);
      properties[definition.runtimeKey] = parsedValue;
    } catch (error) {
      properties[definition.runtimeKey] = undefined;
      console.error("[properties.loadObjectProperties] " + definition.propertyId + " failed", error);
    }
  }

  function __controller(_KDB) {
    const definitions = _getObjectPropertyDefinitions();
    const properties = _KDB.properties || {};
    let index;

    for (index = 0; index < definitions.length; index += 1) {
      loadObjectProperty(_KDB, properties, definitions[index]);
    }

    _KDB.properties = properties;
    return properties;
  }

  return __controller;
});
