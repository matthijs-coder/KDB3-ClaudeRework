define([
  "./hidePdfWidgetChromeInClone.js",
  "./inlineLegendSwatchUsesInClone.js"
], function (_hidePdfWidgetChromeInClone, _inlineLegendSwatchUsesInClone) {
  "use strict";

  var PDF_CAPTURE_TIMEOUT_MS = 60000;

  function abortedError() {
    return { code: "DASHBOARD_PDF_ABORTED", message: "Export aborted." };
  }

  function timeoutError() {
    return { code: "DASHBOARD_PDF_CAPTURE_TIMEOUT", message: "Capture timed out." };
  }

  function shouldIgnoreCaptureElement(_element) {
    try {
      return !!(!_element ? false : _element.id === "kdb-control-root");
    } catch (err) {
      console.error("[dashboardPdf.shouldIgnoreCaptureElement] failed", err);
      return false;
    }
  }

  function onCloneCaptureDocument(_clonedDocument, _clonedElement) {
    try {
      _hidePdfWidgetChromeInClone(_clonedElement);
      _inlineLegendSwatchUsesInClone(_clonedDocument, _clonedElement);
    } catch (err) {
      console.error("[dashboardPdf.onCloneCaptureDocument] failed", err);
    }
  }

  function captureCanvasBounded(_html2canvas, _root, _signal) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timeoutId = null;
      var onAbort = null;
      var capturePromise;

      function cleanup() {
        if (timeoutId !== null) clearTimeout(timeoutId);
        if (_signal && typeof _signal.removeEventListener === "function" && onAbort) {
          _signal.removeEventListener("abort", onAbort);
        }
      }

      function settle(_callback, _value) {
        if (settled) return;
        settled = true;
        cleanup();
        _callback(_value);
      }

      if (_signal && _signal.aborted) {
        settle(reject, abortedError());
        return;
      }
      timeoutId = setTimeout(function () {
        settle(reject, timeoutError());
      }, PDF_CAPTURE_TIMEOUT_MS);
      if (_signal && typeof _signal.addEventListener === "function") {
        onAbort = function () { settle(reject, abortedError()); };
        _signal.addEventListener("abort", onAbort, { once: true });
      }
      try {
        capturePromise = _html2canvas(_root, {
          scale: 2,
          useCORS: true,
          logging: false,
          ignoreElements: shouldIgnoreCaptureElement,
          onclone: onCloneCaptureDocument
        });
      } catch (error) {
        settle(reject, error);
        return;
      }
      Promise.resolve(capturePromise).then(
        function (canvas) { settle(resolve, canvas); },
        function (error) { settle(reject, error); }
      );
    });
  }

  return captureCanvasBounded;
});
