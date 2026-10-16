define([], function () {
  "use strict";

  function runRemount(_runtime, _options) {
    _runtime.timers.remountTimer = null;
    try {
      _options.remount();
    } catch (error) {
      console.error("[wienKiControls.bindToolbarObserver]", error);
    }
  }

  function onToolbarMutation(_runtime, _options) {
    try {
      if (_runtime.timers.remountTimer) clearTimeout(_runtime.timers.remountTimer);
      _runtime.timers.remountTimer = setTimeout(runRemount.bind(null, _runtime, _options), 0);
    } catch (error) {
      console.error("[wienKiControls.bindToolbarObserver]", error);
    }
  }

  function bindToolbarObserver(_KDB, _options) {
    var runtime = _KDB.runtime.wienKiControls;
    try {
      if (runtime.observers.toolbar) return true;
      if (typeof MutationObserver !== "function" || typeof document === "undefined" || !document.body) return false;
      runtime.observers.toolbar = new MutationObserver(onToolbarMutation.bind(null, runtime, _options));
      runtime.observers.toolbar.observe(document.body, { childList: true, subtree: true });
      return true;
    } catch (err) {
      console.error("[wienKiControls.bindToolbarObserver]", err);
      return false;
    }
  }

  return bindToolbarObserver;
});
