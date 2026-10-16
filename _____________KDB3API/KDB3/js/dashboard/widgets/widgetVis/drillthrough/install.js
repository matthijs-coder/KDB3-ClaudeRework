define([
  "../effects/installAllDrillthrough.js",
  "../effects/runContentCreateDrillthroughInstall.js",
  "../effects/cleanupDrillthroughDecorations.js",
  "../effects/syncDrillthroughAfterFocusExit.js"
], function (_installAllDrillthrough, _runContentCreateDrillthroughInstall, _cleanupDrillthroughDecorations, _syncDrillthroughAfterFocusExit) {
  "use strict";

  return {
    installDrillthrough: _installAllDrillthrough,
    installContentDecorations: _runContentCreateDrillthroughInstall,
    cleanupDrillthroughDecorations: _cleanupDrillthroughDecorations,
    syncDrillthroughAfterFocusExit: _syncDrillthroughAfterFocusExit
  };
});
