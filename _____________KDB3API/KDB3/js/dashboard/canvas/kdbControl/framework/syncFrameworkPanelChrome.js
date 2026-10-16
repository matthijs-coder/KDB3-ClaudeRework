define([], function () {
  "use strict";
  function setClass(el, cls, on) {
    try {
      if (!el) return;
      if (on) el.classList.add(cls);
      else el.classList.remove(cls);
    } catch (err) {
      console.error("[kdbControl.syncFrameworkPanelChrome] setClass failed", err);
      throw err;
    }
  }
  function clearPanelUi(metricsEl, toolboxEl, settingsEl, togglesEl) {
    try {
      var p;
      var panels = [metricsEl, toolboxEl, settingsEl];
      for (p = 0; p < panels.length; p++) {
        setClass(panels[p], "KDB_visible", false);
        setClass(panels[p], "kdb-control_selected", false);
      }
      if (togglesEl) {
        var btns = togglesEl.querySelectorAll("[data-panel-id]");
        var i;
        for (i = 0; i < btns.length; i++) setClass(btns[i], "kdb-control_selected", false);
      }
    } catch (err) {
      console.error("[kdbControl.syncFrameworkPanelChrome] clearPanelUi failed", err);
      throw err;
    }
  }
  function syncSections(container, openSectionId) {
    try {
      if (!container) return;
      var shells = container.querySelectorAll(".kdb-control__section-shell");
      var i;
      for (i = 0; i < shells.length; i++) {
        var sh = shells[i];
        var head = sh.querySelector("[data-section-id]");
        var sid = head && head.getAttribute("data-section-id");
        var isOpen = !!sid && sid === openSectionId;
        setClass(sh, "kdb-control_section_open", isOpen);
        setClass(head, "kdb-control_section-head_selected", isOpen);
      }
    } catch (err) {
      console.error("[kdbControl.syncFrameworkPanelChrome] syncSections failed", err);
      throw err;
    }
  }
  function __controller(_dr, _collapsed, _panel, _openSid) {
    try {
      setClass(_dr.rootEl, "kdb-control_collapsed", _collapsed);
      setClass(_dr.contentEl, "kdb-control_content_hidden", _collapsed);
      setClass(_dr.contentEl, "kdb-control_settings-open", _panel === "settings");
      clearPanelUi(_dr.metricsContainerEl, _dr.toolboxContainerEl, _dr.settingsContainerEl, _dr.mainTogglesEl);
      if (_panel === "metrics") {
        setClass(_dr.metricsContainerEl, "KDB_visible", true);
        setClass(_dr.metricsContainerEl, "kdb-control_selected", true);
      } else if (_panel === "toolbox") {
        setClass(_dr.toolboxContainerEl, "KDB_visible", true);
        setClass(_dr.toolboxContainerEl, "kdb-control_selected", true);
      } else if (_panel === "settings") {
        setClass(_dr.settingsContainerEl, "KDB_visible", true);
        setClass(_dr.settingsContainerEl, "kdb-control_selected", true);
      }
      if (_dr.mainTogglesEl) {
        var btns = _dr.mainTogglesEl.querySelectorAll("[data-panel-id]");
        var j;
        for (j = 0; j < btns.length; j++) {
          var b = btns[j];
          if (b.getAttribute("data-panel-id") === _panel) setClass(b, "kdb-control_selected", true);
        }
      }
      var settingsIconBtn = _dr.rootEl && _dr.rootEl.querySelector('[data-header-action="select-settings"]');
      setClass(settingsIconBtn, "kdb-control_selected", _panel === "settings");
      syncSections(_dr.toolboxContainerEl, _openSid);
      syncSections(_dr.settingsContainerEl, _openSid);
    } catch (err) {
      console.error("[kdbControl.syncFrameworkPanelChrome] failed", err);
      throw err;
    }
  }
  return __controller;
});
