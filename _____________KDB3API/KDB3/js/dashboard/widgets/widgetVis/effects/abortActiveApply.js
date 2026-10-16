define([], function () {
  "use strict";

  function abortActiveApply(_runtime) {
    var controllers = _runtime.abortControllers || {};
    Object.keys(controllers).forEach(function (_key) {
      var controller = controllers[_key];
      if (controller && typeof controller.abort === "function") {
        controller.abort();
      }
    });
    _runtime.abortControllers = {};
  }

  return abortActiveApply;
});
