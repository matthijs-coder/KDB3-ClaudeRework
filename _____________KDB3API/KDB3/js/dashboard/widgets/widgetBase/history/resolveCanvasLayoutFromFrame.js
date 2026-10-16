// shim (WS-L phase A): remove in Phase B; re-exports the merged implementation
define(["../history.js"], function (_m) {
  return { hasLayout: _m.hasLayout, resolveCanvasLayoutFromFrame: _m.resolveCanvasLayoutFromFrame, mergeDomLayoutIntoFrame: _m.mergeDomLayoutIntoFrame };
});
