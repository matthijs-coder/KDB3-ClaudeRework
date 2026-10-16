define([], function () {
  "use strict";
  function tryFrameworkSyncView(_KDB) {
    try {
      var rtk = _KDB.runtime && _KDB.runtime.kdbControl;
      var ctx = rtk && rtk.frameworkBindContext;
      if (ctx && typeof ctx.syncView === "function") ctx.syncView();
    } catch (syncErr) {
      void syncErr;
    }
  }
  return tryFrameworkSyncView;
});
