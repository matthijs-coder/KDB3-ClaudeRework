define([
  "../config/sichtDefinitions.js"
], function (_sichtDefinitions) {
  "use strict";

  function evaluateSichtOptions(_KDB, _availability) {
    var byOption = {};
    var evaluatedAt = Date.now();
    var availability = _availability || {};

    Object.keys(_sichtDefinitions).forEach(function (_key) {
      var definition = _sichtDefinitions[_key];
      var entry = availability[_key] || {};
      var isVisible = entry.isVisible === true;
      var isDefaultReady = entry.isDefaultReady === true;
      byOption[_key] = {
        displayValue: definition.displayValue,
        useValue: entry.useValue != null ? String(entry.useValue) : "",
        optionTableKey: definition.optionTableKey,
        defaultTableKey: definition.defaultTableKey,
        isVisible: isVisible,
        isDefaultReady: isDefaultReady,
        isEnabled: isVisible && isDefaultReady,
        lastSyncedAt: evaluatedAt
      };
    });

    return { byOption: byOption, evaluatedAt: evaluatedAt };
  }

  return evaluateSichtOptions;
});
