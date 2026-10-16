define([
  "./wireHeaderSettingsClick",
  "./syncFrameworkPanelChrome",
  "./syncFrameworkPlaceholderInputs",
  "./syncFrameworkTabEditUi",
  "./syncFrameworkSwitchCheckboxes",
], function (
  _wireHeaderSettingsClick,
  _syncFrameworkPanelChrome,
  _syncFrameworkPlaceholderInputs,
  _syncFrameworkTabEditUi,
  _syncFrameworkSwitchCheckboxes
) {
  "use strict";
  function __controller(_KDB) {
    try {
      var rt = _KDB.runtime && _KDB.runtime.kdbControl;
      if (!rt || !rt.domRefs) return;
      var dr = rt.domRefs;
      var fw = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.framework;
      if (!fw) return;
      _wireHeaderSettingsClick(_KDB);
      var collapsed = !!fw.isCollapsed;
      var panel = fw.activeTopPanel || "metrics";
      var openSid = fw.openSectionId;
      _syncFrameworkPanelChrome(dr, collapsed, panel, openSid);
      _syncFrameworkPlaceholderInputs(_KDB, dr.contentEl);
      _syncFrameworkSwitchCheckboxes.syncHeaderEditModeRadios(_KDB, dr.contentEl);
      _syncFrameworkTabEditUi(_KDB, dr.contentEl);
      _syncFrameworkSwitchCheckboxes(_KDB, dr.contentEl);
      if (dr.arrowEl) dr.arrowEl.textContent = collapsed ? "\u25b6" : "\u25c0";
      if (dr.arrowEl) dr.arrowEl.setAttribute("aria-expanded", collapsed ? "false" : "true");
    } catch (err) {
      console.error("[kdbControl.syncFrameworkViewFromState] failed", err);
      throw err;
    }
  }
  return __controller;
});
