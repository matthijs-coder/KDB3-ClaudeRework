define([
  "../../../header/state/selectors",
  "../../../footer/state/selectors",
], function (_headerSel, _footerSel) {
  "use strict";
  function syncHeaderEditModeRadios(_KDB, gallery) {
    try {
      var row = gallery.querySelector('.kdb-control__gallery-row-radio[data-placeholder-control-id="headerEditMode"]');
      if (!row) return;
      var et = _headerSel.readHeaderEditTarget(_KDB);
      var val = et === "title" ? "renameHeader" : et === "subtitle" ? "renameHeaderSubtitle" : null;
      var radios = row.querySelectorAll('input[type="radio"]');
      var i;
      for (i = 0; i < radios.length; i++) {
        radios[i].checked = val != null && radios[i].value === val;
      }
    } catch (err) {
      console.error("[kdbControl.syncFrameworkSwitchCheckboxes] syncHeaderEditModeRadios failed", err);
      throw err;
    }
  }
  function syncKdbActionSwitchCheckboxes(_KDB, gallery) {
    try {
      if (!gallery) return;
      var boxes = gallery.querySelectorAll('input.kdb-control_switch-input[type="checkbox"][data-kdb-action]');
      var i;
      for (i = 0; i < boxes.length; i++) {
        var el = boxes[i];
        var action = el.getAttribute("data-kdb-action");
        if (action === "header.toggle") {
          el.checked = _headerSel.readHeaderStatus(_KDB) === "active";
          continue;
        }
        if (action === "footer.toggle") {
          el.checked = _footerSel.readFooterStatus(_KDB) === "active";
          continue;
        }
        if (action === "header.subtitle.toggle") {
          el.checked = _headerSel.readHeaderSubtitleVisible(_KDB);
          continue;
        }
        if (action === "dashboard.settingsButtons.toggle") {
          var dash = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.settings && _KDB.state.kdbControl.settings.dashboard;
          el.checked = !!(dash && dash.hideWidgetSettingsButtons);
          continue;
        }
        if (action === "dashboard.developerMode.toggle") {
          var dashSu = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.settings && _KDB.state.kdbControl.settings.dashboard;
          el.checked = !!(dashSu && dashSu.isDeveloperMode);
          continue;
        }
        var fw = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.framework;
        if (!fw) continue;
        var ps = fw.placeholderSelections || {};
        if (!action || !Object.prototype.hasOwnProperty.call(ps, action)) continue;
        var v = ps[action];
        el.checked = v === "1" || v === "true";
      }
    } catch (err) {
      console.error("[kdbControl.syncFrameworkSwitchCheckboxes] syncKdbActionSwitchCheckboxes failed", err);
      throw err;
    }
  }
  function __controller(_KDB, _gallery) {
    try {
      syncKdbActionSwitchCheckboxes(_KDB, _gallery);
    } catch (err) {
      throw err;
    }
  }
  __controller.syncHeaderEditModeRadios = syncHeaderEditModeRadios;
  return __controller;
});
