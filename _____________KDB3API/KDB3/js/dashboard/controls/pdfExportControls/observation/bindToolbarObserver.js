define([], function () {
  "use strict";

  function bindToolbarObserver(_KDB, _options) {
    var runtime = _KDB.runtime.pdfExportControls;
    if (runtime.observers.toolbar) return true;
    if (typeof MutationObserver !== "function" || typeof document === "undefined" || !document.body) return false;
    runtime.observers.toolbar = new MutationObserver(function () {
      if (runtime.timers.remountTimer) clearTimeout(runtime.timers.remountTimer);
      runtime.timers.remountTimer = setTimeout(function () {
        runtime.timers.remountTimer = null;
        try {
          _options.remount();
        } catch (error) {
          console.error("[pdfExportControls.bindToolbarObserver]", error);
        }
      }, 0);
    });
    runtime.observers.toolbar.observe(document.body, { childList: true, subtree: true });
    return true;
  }

  return bindToolbarObserver;
});
