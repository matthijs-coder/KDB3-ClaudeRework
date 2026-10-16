define([], function () {
  "use strict";

  function schedulePaintWait(_resolve) {
    try {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(_resolve);
        return;
      }
      setTimeout(_resolve, 0);
    } catch (error) {
      console.error("[dashboardPdf.yieldForPaint] schedule failed", error);
      _resolve();
    }
  }

  function waitOnePaint() {
    try {
      return new Promise(schedulePaintWait);
    } catch (error) {
      console.error("[dashboardPdf.yieldForPaint] failed", error);
      return Promise.resolve();
    }
  }

  async function __controller(_signal) {
    try {
      await waitOnePaint();
      if (_signal && _signal.aborted) return;
      await waitOnePaint();
      if (_signal && _signal.aborted) return;
    } catch (error) {
      console.error("[dashboardPdf.yieldForPaint] failed", error);
    }
  }

  return __controller;
});
