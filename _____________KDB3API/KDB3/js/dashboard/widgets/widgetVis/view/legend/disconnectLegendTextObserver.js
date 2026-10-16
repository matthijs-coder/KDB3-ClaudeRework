define([], function () {
  "use strict";

  function disconnectLegendTextObserver(_runtime) {
    try {
      var disconnected = false;
      if (!_runtime) {
        return { disconnected: disconnected };
      }
      var observers = _runtime.observers || {};
      var observer = observers.legendText;
      if (observer && typeof observer.disconnect === "function") {
        observer.disconnect();
        delete observers.legendText;
        disconnected = true;
      }
      var timers = _runtime.timers || {};
      if (timers.legendTextDebounce) {
        clearTimeout(timers.legendTextDebounce);
        delete timers.legendTextDebounce;
      }
      _runtime._legendSanitizeActive = false;
      return { disconnected: disconnected };
    } catch (err) {
      console.error("[widgetVis.disconnectLegendTextObserver] failed", err);
      throw err;
    }
  }

  return disconnectLegendTextObserver;
});
