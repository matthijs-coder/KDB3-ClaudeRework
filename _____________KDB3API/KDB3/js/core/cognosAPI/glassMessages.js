define([], function () {
  "use strict";

  function __controller(_KDB) {
    return buildGlassMessagesApi();
  }

  function buildGlassMessagesApi() {
    return {
      showToast: showToast,
      showErrorDialog: showErrorDialog,
      showMessageDialog: showMessageDialog,
    };
  }

  function showToast(_text, _type) {
    return window.__glassAppController.glassContext.showToast(_text, {
      type: _type,
    });
  }

  function showErrorDialog(_text, _title) {
    return window.__glassAppController.glassContext.showErrorMessage(_text, _title);
  }

  function showMessageDialog(_text, _title, _type) {
    return window.__glassAppController.glassContext.showMessage(_text, _title, _type);
  }

  return __controller;
});
