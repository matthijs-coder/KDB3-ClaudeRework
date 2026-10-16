define([
  "./write/setWidgetProperty.js",
  "./write/setWidgetLayout.js",
  "./write/renderWidget.js",
  "./write/enterFocusMode.js",
  "./write/exitFocusMode.js"
], function (
  _setWidgetProperty,
  _setWidgetLayout,
  _renderWidget,
  _enterFocusMode,
  _exitFocusMode
) {
  "use strict";

  function __controller(_ctx) {
    return {
      setWidgetProperty: _setWidgetProperty.bind(null, _ctx),
      setWidgetLayout: _setWidgetLayout.bind(null, _ctx),
      renderWidget: _renderWidget.bind(null, _ctx),
      enterFocusMode: _enterFocusMode.bind(null, _ctx),
      exitFocusMode: _exitFocusMode.bind(null, _ctx)
    };
  }

  return __controller;
});
