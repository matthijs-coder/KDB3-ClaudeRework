define(["./awaitRenderEvent.js"], function (_awaitRenderEvent) {
  "use strict";

  function __controller(_ctx, _widgetId, _options) {
    return _awaitRenderEvent(_ctx, _widgetId, "whenRenderStart", _options);
  }

  return __controller;
});
