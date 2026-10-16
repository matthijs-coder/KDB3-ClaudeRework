define([], function () {
  "use strict";

  function delayAbortAware(_signal, _ms) {
    return new Promise(function (resolve) {
      var timeoutId = setTimeout(function () {
        resolve();
      }, _ms);
      if (!_signal || typeof _signal.addEventListener !== "function") return;
      _signal.addEventListener("abort", function () {
        clearTimeout(timeoutId);
        resolve();
      }, { once: true });
    });
  }

  async function waitForCaptureReadiness(_root, _signal, _timeoutMs, _spinnerSelector) {
    try {
      var startedAt = Date.now();
      var timeoutMs = typeof _timeoutMs === "number" && _timeoutMs > 0 ? _timeoutMs : 30000;
      var spinnerSelector = _spinnerSelector || "";
      var spinners;
      while (true) {
        if (_signal && _signal.aborted) return { ok: false, errorCode: "DASHBOARD_PDF_ABORTED", errorMessage: "Export aborted." };
        if (!spinnerSelector) return { ok: true };
        spinners = _root && _root.querySelectorAll ? _root.querySelectorAll(spinnerSelector) : [];
        if (spinners.length === 0) {
          await delayAbortAware(_signal, 100);
          if (_signal && _signal.aborted) return { ok: false, errorCode: "DASHBOARD_PDF_ABORTED", errorMessage: "Export aborted." };
          if ((_root && _root.querySelectorAll ? _root.querySelectorAll(spinnerSelector).length : 0) === 0) {
            return { ok: true };
          }
        }
        if (Date.now() - startedAt >= timeoutMs) {
          return {
            ok: false,
            errorCode: "DASHBOARD_PDF_CAPTURE_READINESS_TIMEOUT",
            errorMessage: "Capture root readiness gate timed out while loading indicator nodes remained in capture root."
          };
        }
        await delayAbortAware(_signal, 100);
      }
    } catch (error) {
      console.error("[dashboardPdf.waitForCaptureReadiness] failed", error);
      throw error;
    }
  }

  return waitForCaptureReadiness;
});
