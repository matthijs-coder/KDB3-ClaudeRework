define([
  "../effects/readWidgetLayoutFromDom.js",
  "../state/isNumericLayout.js"
], function (_readWidgetLayoutFromDom, _isNumericLayout) {
  "use strict";

  function resolveCanvasLayoutFromFrame(frame) {
    const value = frame || {};
    if (_isNumericLayout(value.lastCanvasLayout)) {
      return value.lastCanvasLayout;
    }
    if (_isNumericLayout(value.layout)) {
      return value.layout;
    }
    return null;
  }

  function mergeDomLayoutIntoFrame(_KDB, frame, shellEl) {
    if (!frame) {
      return null;
    }
    const merged = Object.assign({}, frame);
    if (frame.placement !== "onCanvas" || !shellEl) {
      return merged;
    }
    const domLayout = _readWidgetLayoutFromDom(_KDB, shellEl);
    if (!domLayout) {
      return merged;
    }
    merged.layout = domLayout;
    merged.lastCanvasLayout = domLayout;
    return merged;
  }

  return {
    hasLayout: _isNumericLayout,
    resolveCanvasLayoutFromFrame: resolveCanvasLayoutFromFrame,
    mergeDomLayoutIntoFrame: mergeDomLayoutIntoFrame
  };
});
