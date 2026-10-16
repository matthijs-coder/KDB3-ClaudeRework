define([], function () {
  "use strict";

  // Tabs spec is used only to canonicalise a canvas container id onto a tab
  // id, matching widgetBase's previous resolveCanonicalTabId. This is not the
  // tabs facet (slice 5); it is host flattening for CanvasWidgetDescriptor.tabId.
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.tabs || null;
  }

  return __controller;
});
