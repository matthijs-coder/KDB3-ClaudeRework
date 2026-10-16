define(["./propertyDefinitions.js"], function (_definitions) {
  "use strict";

  function resolveContent(_KDB) {
    return _KDB &&
      _KDB.runtime &&
      _KDB.runtime.core &&
      _KDB.runtime.core.adapters &&
      _KDB.runtime.core.adapters.content;
  }

  // Cognos host call: a failing property read degrades to undefined.
  function readPropertyValue(_KDB, _propertyId) {
    var content = resolveContent(_KDB);
    if (!content || typeof content.getPropertyValue !== "function") {
      console.error("[properties.readPropertyValue] " + _propertyId + " content adapter unavailable");
      return undefined;
    }
    try {
      return content.getPropertyValue(_propertyId);
    } catch (error) {
      console.error("[properties.readPropertyValue] " + _propertyId + " getPropertyValue failed", error);
      return undefined;
    }
  }

  // Property input must be a JSON object of exactly one key equal to the property id; anything else is undefined.
  function parsePropertyInput(_propertyId, _rawInput) {
    var input, parsed, keys;
    if (_rawInput === null || _rawInput === undefined) {
      return undefined;
    }
    input = String(_rawInput).trim();
    if (!input || input === "-") {
      return undefined;
    }
    if (input.charAt(0) !== "{" || input.charAt(input.length - 1) !== "}") {
      console.error("[properties.parsePropertyInput] " + _propertyId + " input must start with { and end with }");
      return undefined;
    }
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      console.error("[properties.parsePropertyInput] " + _propertyId + " parse failed", error);
      return undefined;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.error("[properties.parsePropertyInput] " + _propertyId + " input must parse to an object");
      return undefined;
    }
    keys = Object.keys(parsed);
    if (keys.length !== 1 || keys[0] !== _propertyId) {
      console.error("[properties.parsePropertyInput] " + _propertyId + " wrapper key must exactly match propertyId");
      return undefined;
    }
    return parsed[_propertyId];
  }

  function normalizeToggleValue(_value) {
    var normalized;
    if (_value === true || _value === false) {
      return _value;
    }
    if (_value == null) {
      return false;
    }
    if (typeof _value === "string") {
      normalized = _value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "") {
        return false;
      }
    }
    return !!_value;
  }

  function readToggleProperty(_KDB, _propertyId) {
    return normalizeToggleValue(readPropertyValue(_KDB, _propertyId));
  }

  // Rebuilds `_KDB.properties` from the 16 object and 4 toggle definitions.
  function loadProperties(_KDB) {
    var properties = {};
    _KDB.properties = properties;
    _definitions.OBJECTS.forEach(function (definition) {
      var rawInput = readPropertyValue(_KDB, definition.propertyId);
      properties[definition.runtimeKey] = parsePropertyInput(definition.propertyId, rawInput);
    });
    _definitions.TOGGLES.forEach(function (definition) {
      properties[definition.runtimeKey] = readToggleProperty(_KDB, definition.propertyId);
    });
    return properties;
  }

  return {
    loadProperties: loadProperties,
    readPropertyValue: readPropertyValue,
    readToggleProperty: readToggleProperty
  };
});
