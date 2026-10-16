define(["../config/actionTypes.js", "../config/defaults.js", "../config/selectors.js"], function (_actionTypes, _defaults, _selectors) {
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
    const start = Date.now(); let buttons = readTabButtons(_ctx._KDB);
    if (checks && typeof checks.beginWait === "function") checks.beginWait(_ctx._KDB, key);
    while (!_ctx.isDisposed() && buttons.length === 0 && Date.now() - start < _defaults.HYDRATE_TIMEOUT_MS) {
      await delay(_ctx, _defaults.POLL_INTERVAL_MS);
      buttons = readTabButtons(_ctx._KDB);
    }
    const found = !!buttons[_defaults.HELPER_TAB_INDEX] || hasHelperContent();
    const chromeFound = collectRealTabButtonWrappers(_selectors.primaryTabButtonSelector).length > 0;
    if (checks && typeof checks.endWait === "function") {
      checks.endWait(_ctx._KDB, key, { aborted: !!_ctx.isDisposed(), found: chromeFound });
    }
    return found;
  }

  function delay(_ctx, ms) { const runtime = _ctx._KDB.runtime.tabs; return new Promise(function (resolve) { const timerId = setTimeout(function () { delete runtime.timers.hydrateDelay; resolve(); }, ms); runtime.timers.hydrateDelay = timerId; }); }
  function hasHelperContent() { return typeof document !== "undefined" && !!document.querySelector && !!document.querySelector("." + _defaults.HELPER_TAB_CONTENT_CLASS); }

  function readTabButtons(_KDB) {
    if (typeof document === "undefined" || !document.querySelectorAll) { return []; }
    const primary = collectRealTabButtonWrappers(_selectors.primaryTabButtonSelector); const buttons = primary.length > 0 ? primary : collectRealTabButtonWrappers(_selectors.fallbackTabButtonSelector);
    if (_KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.domRefs) { _KDB.runtime.tabs.domRefs.buttons = buttons; }
    return buttons;
  }

  function collectRealTabButtonWrappers(selector) { if (!selector) { return []; } const buttons = []; toArray(document.querySelectorAll(selector)).forEach(function (wrapper) { const item = wrapper && wrapper.querySelector ? wrapper.querySelector(_selectors.tabButtonItemSelector) : null; const index = readTabItemIndex(item); if (index != null && !buttons[index]) { buttons[index] = wrapper; } }); return buttons; }
  function readTabItemIndex(item) { const rawIndex = item && item.getAttribute ? item.getAttribute(_selectors.tabIndexAttribute) : null; const index = rawIndex == null ? NaN : Number(rawIndex); return index >= _selectors.tabIndexBase && index === Math.floor(index) ? index : null; }
  function toArray(nodeList) { return Array.prototype.slice.call(nodeList || []); }
  function toErrorMessage(err) { return err && err.message ? err.message : String(err || "Unknown tabs error."); }

  return hydrateTabsDom;
});
