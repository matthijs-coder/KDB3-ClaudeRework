define(["../events/eventNames", "./warnMissingOwnerApis"], function (_eventNames, _warnApis) {
  "use strict";
  var kdbForKdbActionToggles = null;
  var OWNER_ACTIONS = { "header.toggle": 1, "footer.toggle": 1, "header.subtitle.toggle": 1 };
  function readFrameworkBindContext(_KDB) {
    return _KDB && _KDB.runtime && _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.frameworkBindContext;
  }
  function primitiveSyncAfter() {
    var ctx = readFrameworkBindContext(kdbForKdbActionToggles);
    if (ctx && typeof ctx.syncView === "function") ctx.syncView();
  }
  function dispatchOwnerToggle(dataKdbAction) {
    var _KDB = kdbForKdbActionToggles;
    if (!_KDB) return false;
    if (dataKdbAction === "header.toggle" || dataKdbAction === "header.subtitle.toggle") {
      var ha = _KDB.api && _KDB.api.header;
      if (!ha || typeof ha.dispatch !== "function") {
        _warnApis.warnMissingHeaderDispatch();
        return true;
      }
      var ht = dataKdbAction === "header.toggle" ? "header/toggle" : "header/toggleSubtitle";
      ha.dispatch({ type: ht, payload: { source: "kdbControl" } });
      return true;
    }
    if (dataKdbAction === "footer.toggle") {
      var fa = _KDB.api && _KDB.api.footer;
      if (!fa || typeof fa.dispatch !== "function") {
        _warnApis.warnMissingFooterDispatch();
        return true;
      }
      fa.dispatch({ type: "footer/toggle", payload: { source: "kdbControl" } });
      return true;
    }
    return false;
  }
  function onKdbActionCheckboxChange(ev) {
    var ctx = readFrameworkBindContext(kdbForKdbActionToggles);
    if (!ctx) return;
    var t = ev.target;
    if (!t || t.tagName !== "INPUT" || t.type !== "checkbox") return;
    if (!t.classList || !t.classList.contains("kdb-control_switch-input")) return;
    var action = t.getAttribute("data-kdb-action");
    if (!action) return;
    if (OWNER_ACTIONS[action]) {
      if (dispatchOwnerToggle(action)) primitiveSyncAfter();
      return;
    }
    if (action === "dashboard.settingsButtons.toggle") {
      ctx.dispatch({
        type: _eventNames.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME,
        payload: { key: "hideWidgetSettingsButtons" },
      });
      primitiveSyncAfter();
      return;
    }
    if (action === "dashboard.developerMode.toggle") {
      ctx.dispatch({ type: _eventNames.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE, payload: {} });
      primitiveSyncAfter();
      return;
    }
    ctx.dispatch({
      type: _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION,
      payload: { controlId: action, value: t.checked ? "1" : "0" },
    });
    primitiveSyncAfter();
  }
  function __controller(_ctx, _signal) {
    var el = _ctx.contentEl;
    if (!el) return;
    kdbForKdbActionToggles = _ctx._KDB;
    el.addEventListener("change", onKdbActionCheckboxChange, { signal: _signal });
  }
  return __controller;
});
