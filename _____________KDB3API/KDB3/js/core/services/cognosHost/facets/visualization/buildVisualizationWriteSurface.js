define([
  "./write/setVisType.js",
  "./write/setVisTitle.js",
  "./write/setContentProperty.js",
  "./write/setDataSource.js"
], function (_setVisType, _setVisTitle, _setContentProperty, _setDataSource) {
  "use strict";

  function __controller(_ctx) {
    return {
      setVisType: _setVisType.bind(null, _ctx),
      setVisTitle: _setVisTitle.bind(null, _ctx),
      setContentProperty: _setContentProperty.bind(null, _ctx),
      setDataSource: _setDataSource.bind(null, _ctx)
    };
  }

  return __controller;
});
