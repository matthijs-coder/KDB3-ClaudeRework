define(["./config.js"], function (_config) {
  "use strict";

  // A run session is { abortController, loadingHandle, loadingWarnings, chromeHidden }, owned by index.js.
  // Loading overlay and capture chrome are best-effort: failures become warnings on the result, never abort the export.

  function addSessionWarning(runSession, scope, code, message) {
    runSession.loadingWarnings.push({ code: code, message: message });
    console.warn("[dashboardPdf." + scope + "]", code, message);
  }

  // The owner document comes from the render parent; Phase 2 replaces this reach-in with an owner accessor.
  function resolveLoadingMountEl(_KDB, selector) {
    var domRefs = _KDB.runtime.core && _KDB.runtime.core.domRefs;
    var rootEl = domRefs ? domRefs.renderParentEl : null;
    var doc = (rootEl && rootEl.ownerDocument) || (typeof document !== "undefined" ? document : null);
    if (!doc || !selector || typeof doc.querySelector !== "function") return null;
    return doc.querySelector(selector);
  }

  function startRunLoading(_KDB, runSession) {
    try {
      var loadingService = _KDB.services && _KDB.services.loading;
      var selectors = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.dashboardPdf : null;
      var selector = selectors && selectors.loadingMountSelector ? selectors.loadingMountSelector : "";
      if (!loadingService) {
        addSessionWarning(runSession, "loading", "DASHBOARD_PDF_LOADING_SERVICE_MISSING", "Loading service is unavailable.");
        return;
      }
      if (!selector) {
        addSessionWarning(runSession, "loading", "DASHBOARD_PDF_LOADING_SELECTOR_MISSING", "loadingMountSelector is missing.");
        return;
      }
      var mountEl = resolveLoadingMountEl(_KDB, selector);
      if (!mountEl) {
        addSessionWarning(runSession, "loading", "DASHBOARD_PDF_LOADING_MOUNT_MISSING", "Loading mount element could not be resolved.");
        return;
      }
      runSession.loadingHandle = loadingService.startLoading({
        mountEl: mountEl,
        mountKey: _config.loading.MOUNT_KEY,
        transparent: false,
        watchdogMs: _config.loading.WATCHDOG_MS,
        sessionMessageKey: _config.loading.SESSION_MESSAGE_KEY
      });
      if (!runSession.loadingHandle) {
        addSessionWarning(runSession, "loading", "DASHBOARD_PDF_LOADING_START_FAILED", "Loading overlay failed to start.");
      }
    } catch (error) {
      console.error("[dashboardPdf.startRunLoading] failed", error);
    }
  }

  function finishRunLoading(_KDB, runSession) {
    try {
      if (!runSession.loadingHandle) return;
      var loadingService = _KDB.services && _KDB.services.loading;
      if (loadingService) {
        loadingService.finishLoading({ handle: runSession.loadingHandle });
        return;
      }
      console.warn("[dashboardPdf.loading] DASHBOARD_PDF_LOADING_FINISH_UNAVAILABLE Loading service is unavailable for finish.");
    } catch (error) {
      console.error("[dashboardPdf.finishRunLoading] failed", error);
    }
  }

  /** Best-effort: a missing loading service or a failing update never fails the export. */
  function updateRunCaption(_KDB, runSession, messageKey) {
    try {
      if (!(runSession && runSession.loadingHandle)) return;
      var loadingService = _KDB.services && _KDB.services.loading;
      if (!loadingService) {
        console.warn("[dashboardPdf.loading] DASHBOARD_PDF_LOADING_UPDATE_UNAVAILABLE Loading service is unavailable for caption update.");
        return;
      }
      loadingService.updateLoadingMessage({ handle: runSession.loadingHandle, messageKey: messageKey });
    } catch (error) {
      console.error("[dashboardPdf.updateRunCaption] failed", error);
    }
  }

  function formatTabCaption(_KDB, messageKey, n, m) {
    var labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de ? _KDB.config.labels.de.loading : null;
    var template = labels ? labels[messageKey] : "";
    if (typeof template !== "string" || template.length === 0) return "";
    return template.replace("{n}", String(n)).replace("{m}", String(m));
  }

  /**
   * "Tab n/m" caption for the capture steps; the loading service is read from _KDB at call time.
   * Skipped when the tab position or label is missing.
   */
  function updateTabCaption(_KDB, handle, messageKey, n, m) {
    var loadingService = _KDB.services && _KDB.services.loading;
    try {
      if (!handle || !loadingService) return;
      var message = formatTabCaption(_KDB, messageKey, n, m);
      if (message) loadingService.updateLoadingMessage({ handle: handle, message: message });
    } catch (error) {
      console.error("[dashboardPdf.updateTabCaption] failed", error);
    }
  }

  function bindProgressCaption(_KDB, runSession, onProgress) {
    return function onExportProgress(payload) {
      var messageKey = _config.loading.STAGE_CAPTION_KEYS[payload && payload.stage];
      if (messageKey) updateRunCaption(_KDB, runSession, messageKey);
      if (typeof onProgress === "function") onProgress(payload);
    };
  }

  function appendLoadingWarnings(result, runSession) {
    var target = result || {};
    var warnings = Array.isArray(target.warnings) ? target.warnings.slice() : [];
    target.warnings = warnings.concat(runSession.loadingWarnings);
    return target;
  }

  function resolveCaptureHost(_KDB) {
    var rootSelectors = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
    var selector = rootSelectors && rootSelectors.dashboardClassHost;
    if (!selector || typeof document === "undefined" || !document.querySelector) return null;
    return document.querySelector(selector);
  }

  function warnCaptureHostMissing(runSession) {
    addSessionWarning(
      runSession,
      "captureChrome",
      "DASHBOARD_PDF_CAPTURE_HOST_MISSING",
      "Dashboard class host could not be resolved for PDF capture chrome."
    );
  }

  function startCaptureChrome(_KDB, runSession) {
    try {
      var hostEl = resolveCaptureHost(_KDB);
      if (!hostEl || !hostEl.classList) {
        warnCaptureHostMissing(runSession);
        return;
      }
      hostEl.classList.add(_config.PDF_CAPTURE_CLASS);
      runSession.chromeHidden = true;
    } catch (error) {
      console.error("[dashboardPdf.startCaptureChrome] failed", error);
    }
  }

  function finishCaptureChrome(_KDB, runSession) {
    if (runSession.chromeHidden !== true) return;
    try {
      var hostEl = resolveCaptureHost(_KDB);
      if (!hostEl || !hostEl.classList) {
        warnCaptureHostMissing(runSession);
        return;
      }
      hostEl.classList.remove(_config.PDF_CAPTURE_CLASS);
    } catch (error) {
      console.error("[dashboardPdf.finishCaptureChrome] failed", error);
    } finally {
      runSession.chromeHidden = false;
    }
  }

  return {
    startRunLoading: startRunLoading,
    finishRunLoading: finishRunLoading,
    updateTabCaption: updateTabCaption,
    bindProgressCaption: bindProgressCaption,
    appendLoadingWarnings: appendLoadingWarnings,
    startCaptureChrome: startCaptureChrome,
    finishCaptureChrome: finishCaptureChrome
  };
});
