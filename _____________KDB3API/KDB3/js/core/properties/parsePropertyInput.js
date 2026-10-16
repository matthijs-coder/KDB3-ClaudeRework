define([], function () {
  "use strict";

  function __controller(_propertyId, _rawInput) {
    try {
      if (_rawInput === null || _rawInput === undefined) {
        return undefined;
      }

      const input = String(_rawInput).trim();
      if (!input || input === "-") {
        return undefined;
      }

      if (input.charAt(0) !== "{" || input.charAt(input.length - 1) !== "}") {
        console.error("[properties.parsePropertyInput] " + _propertyId + " input must start with { and end with }");
        return undefined;
      }

      const parsed = JSON.parse(input);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        console.error("[properties.parsePropertyInput] " + _propertyId + " input must parse to an object");
        return undefined;
      }

      const keys = Object.keys(parsed);
      if (keys.length !== 1 || keys[0] !== _propertyId) {
        console.error("[properties.parsePropertyInput] " + _propertyId + " wrapper key must exactly match propertyId");
        return undefined;
      }

      return parsed[_propertyId];
    } catch (error) {
      console.error("[properties.parsePropertyInput] " + _propertyId + " parse failed", error);
      return undefined;
    }
  }

  return __controller;
});
