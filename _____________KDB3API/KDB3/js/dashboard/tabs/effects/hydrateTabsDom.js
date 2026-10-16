define([
  "../config/actionTypes.js",
  "../config/defaults.js",
  "../chrome.js",
  "../../../core/utils/kit/async.js"
], function (_actionTypes, _defaults, _chrome, _async) {
  "use strict";

  const CHROME_CHECK_KEY = "tabs.primaryTabButtonSelector";

  async function hydrateTabsDom(_ctx) {
    try {
      _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: { phase: "pending", helperDomHydrated: false, errorCode: null, errorMessage: null } });
      const helperDomHydrated = await waitForHydration(_ctx);
      _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: { phase: "confirmed", helperDomHydrated: helperDomHydrated, errorCode: null, errorMessage: null } });
      return helperDomHydrated;
    } catch (err) {
      console.error("[tabs.hydrateDom] hydrate failed", err);
      const message = err && err.message ? err.message : String(err || "Unknown tabs error.");
      _ctx.dispatch({ type: _actionTypes.HYDRATE_DOM, payload: { phase: "failed", helperDomHydrated: false, errorCode: "TABS_HYDRATE_FAILED", errorMessage: message } });
      return false;
    }
  }

  // Polls for the tab buttons; destroy aborts the wait through runtime.abortControllers.hydrate.
  async function waitForHydration(_ctx) {
    const _KDB = _ctx._KDB;
    const checks = _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (checks && typeof checks.beginWait === "function") { checks.beginWait(_KDB, CHROME_CHECK_KEY); }
    const controllers = _KDB.runtime.tabs.abortControllers;
    const controller = new AbortController();
    controllers.hydrate = controller;
    const outcome = await _async.pollUntil({
      check: function () { return _chrome.readTabButtons(_KDB); },
      predicate: function (buttons) { return buttons.length > 0 || _ctx.isDisposed(); },
      timeoutMs: _defaults.HYDRATE_TIMEOUT_MS,
      intervalMs: _defaults.POLL_INTERVAL_MS,
      signal: controller.signal
    });
    if (controllers.hydrate === controller) { delete controllers.hydrate; }
    const buttons = outcome.ok ? outcome.value : [];
    const found = !!buttons[_defaults.HELPER_TAB_INDEX] || hasHelperContent();
    if (checks && typeof checks.endWait === "function") {
      checks.endWait(_KDB, CHROME_CHECK_KEY, { aborted: !!_ctx.isDisposed(), found: _chrome.readPrimaryTabButtons().length > 0 });
    }
    return found;
  }

  function hasHelperContent() {
    return typeof document !== "undefined" && !!document.querySelector && !!document.querySelector("." + _defaults.HELPER_TAB_CONTENT_CLASS);
  }

  return hydrateTabsDom;
});
