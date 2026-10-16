define([
  "../effects/installCanvasMaximize.js",
  "../effects/cleanupCanvasMaximize.js"
], function (_installCanvasMaximize, _cleanupCanvasMaximize) {
  "use strict";

  return {
    installCanvasMaximize: _installCanvasMaximize,
    cleanupCanvasMaximize: _cleanupCanvasMaximize
  };
});
