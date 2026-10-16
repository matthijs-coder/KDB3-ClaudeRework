define([
  "./wait/whenRenderStart.js",
  "./wait/whenRenderComplete.js",
  "./wait/whenCanvasReady.js",
  "./wait/whenWidgetReady.js"
], function (
  _whenRenderStart,
  _whenRenderComplete,
  _whenCanvasReady,
  _whenWidgetReady
) {
  "use strict";

  function __controller(_ctx) {
    return {
      whenRenderStart: _whenRenderStart.bind(null, _ctx),
      whenRenderComplete: _whenRenderComplete.bind(null, _ctx),
      whenCanvasReady: _whenCanvasReady.bind(null, _ctx),
      whenWidgetReady: _whenWidgetReady.bind(null, _ctx)
    };
  }

  return __controller;
});
