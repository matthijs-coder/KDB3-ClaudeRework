define([], function () {
  "use strict";

  // Flat ref handed to the facet for reads and writes. scopeId carries the raw
  // host string so a ref can be fed straight back into a scoped lookup; the
  // facet normalises it internally.
  function __controller(_descriptor) {
    if (!_descriptor) {
      return null;
    }
    return {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      // Carried along because the history-replay path builds a fallback DTO out
      // of the resolved item and used to read this off the resolved descriptor.
      sourceId: _descriptor.sourceId,
      scopeId: _descriptor.rawScopeId,
      rawScopeId: _descriptor.rawScopeId
    };
  }

  return __controller;
});
