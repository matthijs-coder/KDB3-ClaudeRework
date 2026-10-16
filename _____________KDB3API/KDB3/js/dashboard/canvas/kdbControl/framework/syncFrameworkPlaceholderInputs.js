define([], function () {
  "use strict";
  var SETTINGS_CP1_INPUT_IDS = {
    dashboardWidth: 1,
    dashboardHeight: 1,
    dashboardBg: 1,
    graphWidth: 1,
    graphHeight: 1,
    graphBg: 1,
    commentWidth: 1,
    commentHeight: 1,
    commentBg: 1,
    panelBg: 1,
    panelButton: 1,
    panelActionButton: 1,
    panelInnerBg: 1,
  };
  function syncPlaceholders(_KDB, gallery) {
    try {
      var fw = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.framework;
      if (!fw || !gallery) return;
      var pi = fw.placeholderInputs || {};
      var ps = fw.placeholderSelections || {};
      var inputs = gallery.querySelectorAll("[data-placeholder-input-id]");
      var i;
      for (i = 0; i < inputs.length; i++) {
        var inp = inputs[i];
        var id = inp.getAttribute("data-placeholder-input-id");
        if (id && Object.prototype.hasOwnProperty.call(pi, id)) inp.value = pi[id];
      }
      var radioGroups = gallery.querySelectorAll(".kdb-control__gallery-row-radio[data-placeholder-control-id]");
      for (var g = 0; g < radioGroups.length; g++) {
        var radioGroup = radioGroups[g];
        var cid = radioGroup.getAttribute("data-placeholder-control-id");
        if (cid === "headerEditMode") continue;
        if (
          cid === "tabEditActions" &&
          _KDB &&
          _KDB.api &&
          _KDB.api.tabs &&
          typeof _KDB.api.tabs.getState === "function"
        ) {
          continue;
        }
        var val = cid ? ps[cid] : null;
        var radios = radioGroup.querySelectorAll('input[type="radio"]');
        for (i = 0; i < radios.length; i++) {
          radios[i].checked = val != null && radios[i].value === String(val);
        }
      }
      var sel = gallery.querySelector('select[data-placeholder-control-id="demoDropdown"]');
      if (sel && Object.prototype.hasOwnProperty.call(ps, "demoDropdown")) sel.value = String(ps.demoDropdown);
    } catch (err) {
      console.error("[kdbControl.syncFrameworkPlaceholderInputs] syncPlaceholders failed", err);
      throw err;
    }
  }
  function valueForSettingsBoundInput(settings, id) {
    var s = settings || {};
    var dash = s.dashboard || {};
    var cp = s.controlPanel || {};
    var dn = s.defaultsNew || {};
    var vis = dn.visualization || {};
    var com = dn.comment || {};
    switch (id) {
      case "dashboardWidth":
        return dash.width != null ? String(dash.width) : "";
      case "dashboardHeight":
        return dash.height != null ? String(dash.height) : "";
      case "dashboardBg":
        return dash.backgroundColor != null ? String(dash.backgroundColor) : "";
      case "graphWidth":
        return vis.width != null ? String(vis.width) : "";
      case "graphHeight":
        return vis.height != null ? String(vis.height) : "";
      case "graphBg":
        return vis.backgroundColor != null ? String(vis.backgroundColor) : "";
      case "commentWidth":
        return com.width != null ? String(com.width) : "";
      case "commentHeight":
        return com.height != null ? String(com.height) : "";
      case "commentBg":
        return com.backgroundColor != null ? String(com.backgroundColor) : "";
      case "panelBg":
        return cp.backgroundColor != null ? String(cp.backgroundColor) : "";
      case "panelButton":
        return cp.buttonColor != null ? String(cp.buttonColor) : "";
      case "panelActionButton":
        return cp.actionButtonColor != null ? String(cp.actionButtonColor) : "";
      case "panelInnerBg":
        return cp.innerBackgroundColor != null ? String(cp.innerBackgroundColor) : "";
      default:
        return "";
    }
  }
  function syncSettingsBoundInputs(_KDB, gallery) {
    try {
      if (!gallery) return;
      var settings = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.settings;
      var inputs = gallery.querySelectorAll("[data-placeholder-input-id]");
      var i;
      for (i = 0; i < inputs.length; i++) {
        var inp = inputs[i];
        var id = inp.getAttribute("data-placeholder-input-id");
        if (!id || !SETTINGS_CP1_INPUT_IDS[id]) continue;
        inp.value = valueForSettingsBoundInput(settings, id);
      }
    } catch (err) {
      console.error("[kdbControl.syncFrameworkPlaceholderInputs] syncSettingsBoundInputs failed", err);
      throw err;
    }
  }
  function __controller(_KDB, _gallery) {
    try {
      syncPlaceholders(_KDB, _gallery);
      syncSettingsBoundInputs(_KDB, _gallery);
    } catch (err) {
      console.error("[kdbControl.syncFrameworkPlaceholderInputs] failed", err);
      throw err;
    }
  }
  return __controller;
});
