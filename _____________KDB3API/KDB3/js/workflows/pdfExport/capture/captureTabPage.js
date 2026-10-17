define([
  "../../../core/utils/kit/async.js",
  "../../../core/utils/kit/errors.js",
  "../config.js",
  "../session.js",
  "../tabNavigation.js",
  "./captureCanvas.js"
], function (_async, _errors, _config, _session, _tabNavigation, _captureCanvas) {
  "use strict";

  var CODES = _config.CODES;
  var READINESS_POLL_MS = 100;

  function createAbortedError() {
    return _errors.codedError(CODES.ABORTED, _config.ABORTED_MESSAGE);
  }

  function throwIfAborted(signal) {
    if (signal && signal.aborted) throw createAbortedError();
  }

  function isAbortError(error) {
    return !!error && (error.name === "AbortError" || error.code === "ABORTED");
  }

  function readLoadingIndicatorSelector(_KDB) {
    var rootSelectors = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
    return rootSelectors && rootSelectors.loadingIndicatorSelector
      ? rootSelectors.loadingIndicatorSelector
      : _config.LOADING_INDICATOR_FALLBACK;
  }

  function countLoadingIndicators(root, selector) {
    return root && root.querySelectorAll ? root.querySelectorAll(selector).length : 0;
  }

  /**
   * Waits until no loading indicator is left inside the capture root. "Gone" has to hold twice, one poll apart,
   * so a spinner that is about to re-appear is not mistaken for ready.
   * @returns {Promise<{ok: true}|{ok: false, errorCode: string, errorMessage: string}>}
   */
  async function waitForCaptureReadiness(root, signal, timeoutMs, spinnerSelector) {
    var startedAt = Date.now();
    var aborted = { ok: false, errorCode: CODES.ABORTED, errorMessage: _config.ABORTED_MESSAGE };
    while (true) {
      if (signal && signal.aborted) return aborted;
      if (!spinnerSelector) return { ok: true };
      if (countLoadingIndicators(root, spinnerSelector) === 0) {
        await _async.sleep(READINESS_POLL_MS, signal);
        if (signal && signal.aborted) return aborted;
        if (countLoadingIndicators(root, spinnerSelector) === 0) return { ok: true };
      }
      if (Date.now() - startedAt >= timeoutMs) {
        return {
          ok: false,
          errorCode: CODES.CAPTURE_READINESS_TIMEOUT,
          errorMessage: "Capture root readiness gate timed out while loading indicator nodes remained in capture root."
        };
      }
      await _async.sleep(READINESS_POLL_MS, signal);
    }
  }

  function waitOnePaint() {
    return new Promise(function (resolve) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  async function yieldForPaint(signal) {
    await waitOnePaint();
    if (signal && signal.aborted) return;
    await waitOnePaint();
  }

  async function captureCanvasOrThrow(html2canvas, root, signal) {
    try {
      return await _captureCanvas.captureCanvasBounded(html2canvas, root, signal);
    } catch (error) {
      if (isAbortError(error)) throw createAbortedError();
      if (error && (error.code === CODES.ABORTED || error.code === CODES.CAPTURE_TIMEOUT)) throw error;
      throw _errors.codedError(CODES.CAPTURE_FAILED, String(error && error.message ? error.message : error));
    }
  }

  function encodeCanvas(canvas) {
    if (!canvas || Number(canvas.width) <= 0 || Number(canvas.height) <= 0) {
      throw _errors.codedError(CODES.CAPTURE_FAILED, "Captured canvas has invalid size.");
    }
    try {
      return canvas.toDataURL("image/png", 0.7);
    } catch (error) {
      throw _errors.codedError(CODES.CAPTURE_FAILED, String(error && error.message ? error.message : error));
    }
  }

  /**
   * Activates one tab, waits until it is rendered and idle, and captures it as a PNG data URL.
   * `position` is { n, m } (this tab's number and the tab count) for the loading caption.
   * @throws {Error} coded: ABORTED, TAB_GATE_*, TAB_RENDER_FAILED, CAPTURE_*
   */
  async function captureTabPage(_KDB, tab, html2canvas, run, position) {
    var activeRun = _KDB.runtime.dashboardPdf.activeRun;
    var handle = activeRun && activeRun.loadingHandle ? activeRun.loadingHandle : null;
    _session.updateTabCaption(_KDB, handle, "pdfTabPrepare", position.n, position.m);
    await _tabNavigation.activateTabForCapture(_KDB, tab, run.timeoutMs);
    throwIfAborted(run.signal);
    var root = _KDB.cognosAPI.dashboard.resolveCaptureRoot({ tabId: tab.tabId, pageId: tab.pageId });
    if (!root) {
      throw _errors.codedError(CODES.CAPTURE_ROOT_MISSING, "Active capture root could not be proven for tab/page identity.");
    }
    var readiness = await waitForCaptureReadiness(root, run.signal, run.timeoutMs, readLoadingIndicatorSelector(_KDB));
    if (!readiness.ok) throw _errors.codedError(readiness.errorCode, readiness.errorMessage);
    _session.updateTabCaption(_KDB, handle, "pdfTabCapture", position.n, position.m);
    await yieldForPaint(run.signal);
    throwIfAborted(run.signal);
    var canvas = await captureCanvasOrThrow(html2canvas, root, run.signal);
    throwIfAborted(run.signal);
    return encodeCanvas(canvas);
  }

  return { captureTabPage: captureTabPage };
});
