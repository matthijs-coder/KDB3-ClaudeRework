define([
  "../../../core/utils/kit/errors.js",
  "../config.js",
  "./legendSwatches.js"
], function (_errors, _config, _legendSwatches) {
  "use strict";

  var CODES = _config.CODES;

  function ignoreCaptureElement(element) {
    return !!element && element.id === "kdb-control-root";
  }

  function hideAll(root, selector) {
    var nodes = root.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i] && nodes[i].style) nodes[i].style.display = "none";
    }
  }

  function hideHeaderPkzWrappers(root) {
    var nodes = root.querySelectorAll(".widgetHeader .dataWidgetIcon");
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (node && typeof node.querySelector === "function" && node.querySelector(".kdb_hyperlink_icon") && node.style) {
        node.style.display = "none";
      }
    }
  }

  function hidePdfWidgetChromeInClone(clonedElement) {
    hideAll(clonedElement, ".kdb-widget-maximize");
    hideAll(clonedElement, ".kdb-datapoint-pkz");
    hideHeaderPkzWrappers(clonedElement);
  }

  // html2canvas onclone callback: the cloned DOM is rewritten for the PDF, the live dashboard is untouched.
  function onCloneCaptureDocument(clonedDocument, clonedElement) {
    try {
      if (!clonedElement || typeof clonedElement.querySelectorAll !== "function") return;
      hidePdfWidgetChromeInClone(clonedElement);
      _legendSwatches.inlineLegendSwatchesInClone(clonedDocument, clonedElement);
    } catch (error) {
      console.error("[dashboardPdf.onCloneCaptureDocument] failed", error);
    }
  }

  /**
   * Runs html2canvas on `root` with a hard timeout and abort support.
   * @returns {Promise<HTMLCanvasElement>} rejects with a coded ABORTED / CAPTURE_TIMEOUT error, or html2canvas's own error
   */
  function captureCanvasBounded(html2canvas, root, signal) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timeoutId = null;
      var hasSignal = !!signal && typeof signal.addEventListener === "function";

      function onAbort() {
        settle(reject, _errors.codedError(CODES.ABORTED, _config.ABORTED_MESSAGE));
      }

      function settle(callback, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (hasSignal) signal.removeEventListener("abort", onAbort);
        callback(value);
      }

      if (signal && signal.aborted) {
        settle(reject, _errors.codedError(CODES.ABORTED, _config.ABORTED_MESSAGE));
        return;
      }
      timeoutId = setTimeout(function () {
        settle(reject, _errors.codedError(CODES.CAPTURE_TIMEOUT, "Capture timed out."));
      }, _config.PDF_CAPTURE_TIMEOUT_MS);
      if (hasSignal) signal.addEventListener("abort", onAbort, { once: true });
      var capture;
      try {
        capture = html2canvas(root, {
          scale: 2,
          useCORS: true,
          logging: false,
          ignoreElements: ignoreCaptureElement,
          onclone: onCloneCaptureDocument
        });
      } catch (error) {
        settle(reject, error);
        return;
      }
      Promise.resolve(capture).then(
        function (canvas) { settle(resolve, canvas); },
        function (error) { settle(reject, error); }
      );
    });
  }

  return { captureCanvasBounded: captureCanvasBounded };
});
