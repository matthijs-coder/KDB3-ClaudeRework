define(["../config/captureChromeClass.js"], function (_captureChromeClass) {
  "use strict";

  var PDF_CAPTURE_CLASS = _captureChromeClass.PDF_CAPTURE_CLASS;
  var HOST_MISSING_CODE = "DASHBOARD_PDF_CAPTURE_HOST_MISSING";

  function createCaptureWarning(_code, _message) {
    return { code: _code, message: _message };
  }

  function attachCaptureWarning(_runSession, _warning) {
    try {
      if (_runSession && Array.isArray(_runSession.loadingWarnings)) {
        _runSession.loadingWarnings.push(_warning);
      }
      console.warn("[dashboardPdf.captureChrome]", _warning.code, _warning.message);
    } catch (error) {
      console.error("[dashboardPdf.attachCaptureWarning] failed", error);
    }
  }

  function readDashboardClassHostSelector(_KDB) {
    return _KDB &&
      _KDB.elements &&
      _KDB.elements.selectors &&
      _KDB.elements.selectors.root &&
      _KDB.elements.selectors.root.dashboardClassHost || null;
  }

  function resolveCaptureHost(_KDB) {
    try {
      var selector = readDashboardClassHostSelector(_KDB);
      if (!selector || typeof document === "undefined" || !document.querySelector) {
        return null;
      }
      return document.querySelector(selector);
    } catch (error) {
      console.error("[dashboardPdf.manageCaptureChrome] dashboardClassHost resolve failed", error);
      return null;
    }
  }

  function warnHostMissing(_runSession) {
    attachCaptureWarning(
      _runSession,
      createCaptureWarning(HOST_MISSING_CODE, "Dashboard class host could not be resolved for PDF capture chrome.")
    );
  }

  function startCaptureChromeForRun(_KDB, _runSession) {
    try {
      var hostEl;
      if (!_runSession) return;
      hostEl = resolveCaptureHost(_KDB);
      if (!hostEl || !hostEl.classList) {
        warnHostMissing(_runSession);
        return;
      }
      hostEl.classList.add(PDF_CAPTURE_CLASS);
      _runSession.chromeHidden = true;
    } catch (error) {
      console.error("[dashboardPdf.startCaptureChromeForRun] failed", error);
    }
  }

  function finishCaptureChromeForRun(_KDB, _runSession) {
    try {
      var hostEl;
      if (!_runSession || _runSession.chromeHidden !== true) return;
      hostEl = resolveCaptureHost(_KDB);
      if (!hostEl || !hostEl.classList) {
        warnHostMissing(_runSession);
        _runSession.chromeHidden = false;
        return;
      }
      hostEl.classList.remove(PDF_CAPTURE_CLASS);
      _runSession.chromeHidden = false;
    } catch (error) {
      console.error("[dashboardPdf.finishCaptureChromeForRun] failed", error);
      if (_runSession) _runSession.chromeHidden = false;
    }
  }

  return {
    startCaptureChromeForRun: startCaptureChromeForRun,
    finishCaptureChromeForRun: finishCaptureChromeForRun
  };
});
