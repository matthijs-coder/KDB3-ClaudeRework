define([], function () {
  "use strict";

  function resolveContent(_KDB) {
    return _KDB &&
      _KDB.runtime &&
      _KDB.runtime.core &&
      _KDB.runtime.core.adapters &&
      _KDB.runtime.core.adapters.content;
  }

  function __controller(_KDB, _propertyId) {
    const content = resolveContent(_KDB);

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

  return __controller;
});
