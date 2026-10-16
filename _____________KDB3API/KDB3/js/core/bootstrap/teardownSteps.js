define([], function () {
  "use strict";

  function destroyPropertiesController(_KDB) {
    const controller = _KDB.runtime.properties && _KDB.runtime.properties.controller;
    if (controller && typeof controller.destroy === "function") {
      controller.destroy();
    }
  }

  return {
    destroyPropertiesController: destroyPropertiesController
  };
});
