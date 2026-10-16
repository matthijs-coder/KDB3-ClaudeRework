define(["./copyDienststelleValueEntries.js"], function (_copyValues) {
  "use strict";

  function toScopeSelectionValues(_selection) {
    if (!_selection) {
      return [];
    }
    if (Array.isArray(_selection)) {
      return _copyValues(_selection);
    }
    return _copyValues([_selection]);
  }

  return toScopeSelectionValues;
});
