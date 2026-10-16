define([
  "./mountFilterDockController.js",
  "./destroyFilterDockController.js"
], function (_mountFilterDockController, _destroyFilterDockController) {
  "use strict";

  return {
    mount: _mountFilterDockController.mount,
    destroy: _destroyFilterDockController.destroy
  };
});
