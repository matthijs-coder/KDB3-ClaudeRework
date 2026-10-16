define([], function () {
  "use strict";
  // MUST exception: clone of tabs TAB_DUPLICATE_MAX_VISIBLE_TEXT; no tabs/config import; no labels.de merge this WP.
  const TABS_ADD_MAX_VISIBLE_TEXT = "Maximale Anzahl an Registerkarten erreicht.";
  const TABS_MAX_VISIBLE_CODE = "TABS_MAX_VISIBLE";
  let didWarnMissingTabsDispatch = false;
  function dispatchToolboxTabsAdd(_KDB) {
    try {
      const tabsApi = _KDB && _KDB.api && _KDB.api.tabs;
      if (!tabsApi || typeof tabsApi.getState !== "function") {
        console.warn("[kdbControl.dispatchToolboxTabsAdd] tabs getState unavailable — add blocked");
        return;
      }
      const snapshot = tabsApi.getState();
      if (snapshot === undefined || snapshot === null || typeof snapshot !== "object") {
        console.warn("[kdbControl.dispatchToolboxTabsAdd] tabs getState unavailable — add blocked");
        return;
      }
      const svc = _KDB.services && _KDB.services.message;
      if (!svc || typeof svc.notify !== "function") {
        console.warn("[kdbControl.dispatchToolboxTabsAdd] messageService.notify unavailable — add blocked (fail closed)");
        return;
      }
      if (snapshot.canAdd !== true) {
        svc.notify({ severity: "warning", message: TABS_ADD_MAX_VISIBLE_TEXT, code: TABS_MAX_VISIBLE_CODE });
        return;
      }
      if (typeof tabsApi.dispatch !== "function") {
        if (!didWarnMissingTabsDispatch) {
          didWarnMissingTabsDispatch = true;
          console.warn("[kdbControl] _KDB.api.tabs.dispatch is missing; toolbox tab placeholder actions are ignored.");
        }
        return;
      }
      tabsApi.dispatch({ type: "tabs/add", payload: { source: "kdbControl" } });
    } catch (err) {
      console.error("[kdbControl.dispatchToolboxTabsAdd] failed", err);
    }
  }
  return dispatchToolboxTabsAdd;
});
