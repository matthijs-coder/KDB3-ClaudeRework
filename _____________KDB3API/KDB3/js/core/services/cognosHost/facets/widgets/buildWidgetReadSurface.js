define([
  "./read/hasContent.js",
  "./read/getWidgetType.js"
], function (_hasContent, _getWidgetType) {
  "use strict";

  function __controller(_ctx) {
    return {
      hasContent: _hasContent.bind(null, _ctx),
      getWidgetType: _getWidgetType.bind(null, _ctx)
    };
  }

  return __controller;
});
