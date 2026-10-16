define([], function () {
  "use strict";

  function __controller(_spinnerEl, _sessionCaption) {
    try {
      var sessionEl;
      if (!_spinnerEl) {
        return;
      }
      if (typeof _sessionCaption !== "string" || _sessionCaption.length === 0) {
        clearSessionCaption(_spinnerEl);
        return;
      }
      sessionEl = ensureSessionNode(_spinnerEl);
      sessionEl.textContent = _sessionCaption;
      sessionEl.hidden = false;
    } catch (error) {
      console.error("[loadingService.syncLoadingSessionCaption] failed", error);
      throw error;
    }
  }

  function clearSessionCaption(_spinnerEl) {
    var sessionEl = _spinnerEl.querySelector(":scope > .KDB_loadingSessionMessage");
    if (sessionEl && sessionEl.parentNode) {
      sessionEl.parentNode.removeChild(sessionEl);
    }
  }

  function ensureSessionNode(_spinnerEl) {
    var sessionEl = _spinnerEl.querySelector(":scope > .KDB_loadingSessionMessage");
    var indicatorEl = _spinnerEl.querySelector(":scope > .loading_indicator");
    if (!sessionEl) {
      sessionEl = document.createElement("p");
      sessionEl.className = "KDB_loadingSessionMessage";
    }
    _spinnerEl.insertBefore(sessionEl, indicatorEl || _spinnerEl.firstChild);
    return sessionEl;
  }

  return __controller;
});
