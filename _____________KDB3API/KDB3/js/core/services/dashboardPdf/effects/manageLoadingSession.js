define([], function () {
  "use strict";

  var STAGE_CAPTION_KEYS = {
    title: "pdfTitle",
    attachment: "pdfAttachment",
    save: "pdfSave"
  };

  function createLoadingWarning(_code, _message) { return { code: _code, message: _message }; }

  function attachLoadingWarning(_runSession, _warning) {
    try {
      _runSession.loadingWarnings.push(_warning);
      console.warn("[dashboardPdf.loading]", _warning.code, _warning.message);
    } catch (error) {
      console.error("[dashboardPdf.attachLoadingWarning] failed", error);
    }
  }

  function resolveLoadingMountContext(_KDB, _resolveLoadingMountEl) {
    try {
      var selectors = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.dashboardPdf : null;
      var rootEl = _KDB.runtime && _KDB.runtime.core && _KDB.runtime.core.domRefs
        ? _KDB.runtime.core.domRefs.renderParentEl
        : null;
      var selector = selectors && selectors.loadingMountSelector ? selectors.loadingMountSelector : "";
      var resolver = typeof _resolveLoadingMountEl === "function" ? _resolveLoadingMountEl : function () { return null; };
      return { mountEl: resolver(rootEl, selector), selector: selector };
    } catch (error) {
      console.error("[dashboardPdf.resolveLoadingMountContext] failed", error);
      return { mountEl: null, selector: "" };
    }
  }

  function startLoadingForRun(_KDB, _resolveLoadingMountEl, _runSession) {
    try {
      var loadingService = _KDB.services && _KDB.services.loading;
      var context = resolveLoadingMountContext(_KDB, _resolveLoadingMountEl);
      if (!loadingService || typeof loadingService.startLoading !== "function") {
        attachLoadingWarning(_runSession, createLoadingWarning("DASHBOARD_PDF_LOADING_SERVICE_MISSING", "Loading service is unavailable."));
        return;
      }
      if (!context.selector) {
        attachLoadingWarning(_runSession, createLoadingWarning("DASHBOARD_PDF_LOADING_SELECTOR_MISSING", "loadingMountSelector is missing."));
        return;
      }
      if (!context.mountEl) {
        attachLoadingWarning(_runSession, createLoadingWarning("DASHBOARD_PDF_LOADING_MOUNT_MISSING", "Loading mount element could not be resolved."));
        return;
      }
      _runSession.loadingHandle = loadingService.startLoading({
        mountEl: context.mountEl,
        mountKey: "dashboard-pdf-export",
        transparent: false,
        watchdogMs: 1800000,
        sessionMessageKey: "pdfExport"
      });
      if (!_runSession.loadingHandle) {
        attachLoadingWarning(_runSession, createLoadingWarning("DASHBOARD_PDF_LOADING_START_FAILED", "Loading overlay failed to start."));
      }
    } catch (error) {
      console.error("[dashboardPdf.startLoadingForRun] failed", error);
    }
  }

  function appendLoadingWarnings(_result, _runSession) {
    try {
      var result = _result || {};
      var warnings = Array.isArray(result.warnings) ? result.warnings.slice() : [];
      if (_runSession.loadingWarnings.length) warnings = warnings.concat(_runSession.loadingWarnings);
      result.warnings = warnings;
      return result;
    } catch (error) {
      console.error("[dashboardPdf.appendLoadingWarnings] failed", error);
      return _result || {};
    }
  }

  function finishLoadingForRun(_KDB, _runSession) {
    try {
      var loadingService = _KDB.services && _KDB.services.loading;
      if (!(_runSession && _runSession.loadingHandle)) return;
      if (loadingService && typeof loadingService.finishLoading === "function") {
        loadingService.finishLoading({ handle: _runSession.loadingHandle });
        return;
      }
      console.warn("[dashboardPdf.loading] DASHBOARD_PDF_LOADING_FINISH_UNAVAILABLE Loading service is unavailable for finish.");
    } catch (error) {
      console.error("[dashboardPdf.finishLoadingForRun] failed", error);
    }
  }

  function updateRunCaption(_KDB, _runSession, _options) {
    try {
      var loadingService = _KDB && _KDB.services ? _KDB.services.loading : null;
      var options = _options || {};
      if (!(_runSession && _runSession.loadingHandle)) return;
      if (!loadingService || typeof loadingService.updateLoadingMessage !== "function") {
        console.warn("[dashboardPdf.loading] DASHBOARD_PDF_LOADING_UPDATE_UNAVAILABLE Loading service is unavailable for caption update.");
        return;
      }
      loadingService.updateLoadingMessage({
        handle: _runSession.loadingHandle,
        messageKey: options.messageKey
      });
    } catch (error) {
      console.error("[dashboardPdf.updateRunCaption] failed", error);
    }
  }

  function applyProgressCaption(_KDB, _runSession, _payload) {
    try {
      var stage = _payload && _payload.stage;
      var messageKey = STAGE_CAPTION_KEYS[stage];
      if (!messageKey) return;
      updateRunCaption(_KDB, _runSession, { messageKey: messageKey });
    } catch (error) {
      console.error("[dashboardPdf.applyProgressCaption] failed", error);
    }
  }

  function onBoundProgressCaption(_KDB, _runSession, _onProgress, _payload) {
    applyProgressCaption(_KDB, _runSession, _payload);
    if (typeof _onProgress === "function") _onProgress(_payload);
  }

  function bindProgressCaption(_KDB, _runSession, _onProgress) {
    try {
      return onBoundProgressCaption.bind(null, _KDB, _runSession, _onProgress);
    } catch (error) {
      console.error("[dashboardPdf.bindProgressCaption] failed", error);
      return _onProgress;
    }
  }

  return {
    startLoadingForRun: startLoadingForRun,
    appendLoadingWarnings: appendLoadingWarnings,
    finishLoadingForRun: finishLoadingForRun,
    bindProgressCaption: bindProgressCaption
  };
});
