define(["../config/actionTypes.js", "../config/defaults.js", "../chrome.js"], function (_actionTypes, _defaults, _chrome) {
  "use strict";

  async function hydrateTabsDom(_ctx) {
    try {
      _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: { phase: "pending", helperDomHydrated: false, errorCode: null, errorMessage: null } });
      const helperDomHydrated = await waitForHydration(_ctx);
      _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: { phase: "confirmed", helperDomHydrated: helperDomHydrated, errorCode: null, errorMessage: null } });
      return helperDomHydrated;
    } catch (err) {
      console.error("[tabs.hydrateDom] hydrate failed", err);
      _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: { phase: "failed", helperDomHydrated: false, errorCode: "TABS_HYDRATE_FAILED", errorMessage: toErrorMessage(err) } });
      return false;
    }
  }

  async function waitForHydration(_ctx) {
    const checks = _ctx._KDB.runtime && _ctx._KDB.runtime.cognosHost && _ctx._KDB.runtime.cognosHost.chromeChecks;
    const key = "tabs.primaryTabButtonSelector";
    const start = Date.now(); let buttons = _chrome.readTabButtons(_ctx._KDB);
    if (checks && typeof checks.beginWait === "function") checks.beginWait(_ctx._KDB, key);
    while (!_ctx.isDisposed() && buttons.length === 0 && Date.now() - start < _defaults.HYDRATE_TIMEOUT_MS) {
      await delay(_ctx, _defaults.POLL_INTERVAL_MS);
      buttons = _chrome.readTabButtons(_ctx._KDB);
    }
    const found = !!buttons[_defaults.HELPER_TAB_INDEX] || hasHelperContent();
    const chromeFound = _chrome.readPrimaryTabButtons().length > 0;
    if (checks && typeof checks.endWait === "function") {
      checks.endWait(_ctx._KDB, key, { aborted: !!_ctx.isDisposed(), found: chromeFound });
    }
    return found;
  }

  function delay(_ctx, ms) { const runtime = _ctx._KDB.runtime.tabs; return new Promise(function (resolve) { const timerId = setTimeout(function () { delete runtime.timers.hydrateDelay; resolve(); }, ms); runtime.timers.hydrateDelay = timerId; }); }
  function hasHelperContent() { return typeof document !== "undefined" && !!document.querySelector && !!document.querySelector("." + _defaults.HELPER_TAB_CONTENT_CLASS); }
  function toErrorMessage(err) { return err && err.message ? err.message : String(err || "Unknown tabs error."); }

  return hydrateTabsDom;
});
