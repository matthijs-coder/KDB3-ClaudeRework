define([], function () {
  "use strict";

  function syncTabsKdbControlReadView(_KDB) {
    try {
      const api = _KDB && _KDB.api && _KDB.api.kdbControl;
      if (api && typeof api.syncView === "function") {
        api.syncView();
        return true;
      }
      return false;
    } catch (err) {
      console.error("[tabs.syncTabsKdbControlReadView] sync failed", err);
      return false;
    }
  }

  return syncTabsKdbControlReadView;
});
