define([], function () {
  "use strict";

  function disposeFocusModeChrome(widgetId, runtime) {
    var bucket = runtime && runtime.focusMode ? runtime.focusMode : null;
    if (!bucket) {
      return { ok: true, diagnostics: { skipped: "no_focus_bucket" } };
    }
    if (typeof bucket.dispose === "function") {
      try {
        bucket.dispose();
      } catch (err) {
        console.error("[widgetVis.widgetFocusMode.disposeFocusModeChrome] dispose failed", widgetId, err);
      }
    }
    bucket.focusPanelEl = null;
    bucket.dispose = null;
    bucket.observedExpanded = false;
    bucket.source = null;
    return { ok: true, diagnostics: { disposedChrome: true } };
  }

  function disposeFocusMode(_KDB, widgetId, runtime) {
    var bucket = runtime && runtime.focusMode ? runtime.focusMode : null;
    if (!bucket) {
      return { ok: true, diagnostics: { skipped: "no_focus_bucket" } };
    }
    disposeFocusModeChrome(widgetId, runtime);
    if (bucket.observer && typeof bucket.observer.disconnect === "function") {
      try {
        bucket.observer.disconnect();
      } catch (ignoreObserver) {
        /* noop */
      }
    }
    bucket.observer = null;
    return { ok: true, diagnostics: { disposed: true, observerDisconnected: true } };
  }

  return {
    disposeFocusModeChrome: disposeFocusModeChrome,
    disposeFocusMode: disposeFocusMode
  };
});
