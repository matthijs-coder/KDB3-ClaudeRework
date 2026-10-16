define(["../events/eventNames"], function (_eventNames) {
  "use strict";
  var kdbForHeaderSettingsRootClick = null;
  function onHeaderSettingsRootClick(ev) {
    try {
      var _KDB = kdbForHeaderSettingsRootClick;
      if (!_KDB) return;
      var el = ev.target && ev.target.closest && ev.target.closest('[data-header-action="select-settings"]');
      if (!el) return;
      ev.preventDefault();
      if (!_KDB.api || !_KDB.api.kdbControl || typeof _KDB.api.kdbControl.dispatch !== "function") return;
      _KDB.api.kdbControl.dispatch({
        type: _eventNames.ACTION_FRAMEWORK_SELECT_PANEL,
        payload: { panelId: "settings" },
      });
      var rtk = _KDB.runtime && _KDB.runtime.kdbControl;
      var ctx = rtk && rtk.frameworkBindContext;
      if (ctx && typeof ctx.syncView === "function") ctx.syncView();
    } catch (err) {
      console.error("[kdbControl.wireHeaderSettingsClick] onHeaderSettingsRootClick failed", err);
      throw err;
    }
  }
  function wireHeaderSettingsClickOnce(_KDB) {
    try {
      var rt = _KDB.runtime && _KDB.runtime.kdbControl;
      if (!rt || !rt.domRefs || !rt.domRefs.rootEl) return;
      if (rt.frameworkHeaderSettingsWired) return;
      var dr = rt.domRefs;
      var ac = rt.abortControllers && rt.abortControllers.frameworkView;
      var sig = ac && ac.signal;
      if (!sig || sig.aborted) return;
      rt.frameworkHeaderSettingsWired = true;
      kdbForHeaderSettingsRootClick = _KDB;
      dr.rootEl.addEventListener("click", onHeaderSettingsRootClick, { signal: sig });
    } catch (err) {
      console.error("[kdbControl.wireHeaderSettingsClick] wireHeaderSettingsClickOnce failed", err);
      throw err;
    }
  }
  function __controller(_KDB) {
    try {
      wireHeaderSettingsClickOnce(_KDB);
    } catch (err) {
      throw err;
    }
  }
  return __controller;
});
