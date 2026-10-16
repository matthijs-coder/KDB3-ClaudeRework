define([
  "./read/getVisType.js",
  "./read/getVisTitle.js",
  "./read/getSelections.js",
  "./subscribeSelections.js"
], function (_getVisType, _getVisTitle, _getSelections, _subscribeSelections) {
  "use strict";

  function __controller(_ctx) {
    return {
      getVisType: _getVisType.bind(null, _ctx),
      getVisTitle: _getVisTitle.bind(null, _ctx),
      getSelections: _getSelections.bind(null, _ctx),
      subscribeSelections: _subscribeSelections.bind(null, _ctx)
    };
  }

  return __controller;
});
