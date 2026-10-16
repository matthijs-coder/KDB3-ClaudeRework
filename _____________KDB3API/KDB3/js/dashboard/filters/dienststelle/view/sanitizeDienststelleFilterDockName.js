define(["../config/dienststelleDefinitions.js"], function (_definitions) {
  "use strict";

  function __controller(_activeFilterKey) {
    var key = _activeFilterKey != null ? String(_activeFilterKey) : "";
    var defKeys = Object.keys(_definitions);
    var idx;
    var definition;
    if (!key) {
      return null;
    }
    for (idx = 0; idx < defKeys.length; idx += 1) {
      definition = _definitions[defKeys[idx]];
      if (definition && definition.activeFilterKey === key) {
        return definition.visibleFilterLabel;
      }
    }
    return null;
  }

  return __controller;
});
