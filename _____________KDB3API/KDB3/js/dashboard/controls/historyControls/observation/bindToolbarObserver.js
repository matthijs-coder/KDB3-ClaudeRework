define([], function () {
  "use strict";

  function scheduleToolbarRemount(_KDB, _options) {
    var runtime = _KDB.runtime.historyControls;
    var timers = runtime.timers;

    if (timers.toolbarRemount) {
      clearTimeout(timers.toolbarRemount);
    }

    timers.toolbarRemount = setTimeout(function () {
      timers.toolbarRemount = null;
      try {
        if (_options && typeof _options.remount === "function") {
          _options.remount();
        }
      } catch (error) {
        console.error("[historyControls.bindToolbarObserver]", error);
      }
    }, 0);
  }

  function onToolbarMutations(_KDB, _options) {
    scheduleToolbarRemount(_KDB, _options);
  }

  function __controller(_KDB, _options) {
    var runtime;

    runtime = _KDB.runtime.historyControls;
    if (runtime.observers.toolbar) {
      return true;
    }
    if (typeof MutationObserver !== "function" || typeof document === "undefined" || !document.body) {
      return false;
    }

    runtime.observers.toolbar = new MutationObserver(function () {
      onToolbarMutations(_KDB, _options);
    });
    runtime.observers.toolbar.observe(document.body, { childList: true, subtree: true });
    return true;
  }

  return __controller;
});
