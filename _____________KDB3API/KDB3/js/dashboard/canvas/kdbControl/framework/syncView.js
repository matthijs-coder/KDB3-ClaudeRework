define([
  "./syncFormControls.js"
], function (_syncFormControls) {
  "use strict";

  var PANEL_ELEMENTS = { metrics: "metricsContainerEl", toolbox: "toolboxContainerEl", settings: "settingsContainerEl" };

  function toggleClass(el, className, isOn) {
    if (el) el.classList.toggle(className, !!isOn);
  }

  function syncSections(container, openSectionId) {
    if (!container) return;
    container.querySelectorAll(".kdb-control__section-shell").forEach(function (shell) {
      var head = shell.querySelector("[data-section-id]");
      var sectionId = head && head.getAttribute("data-section-id");
      var isOpen = !!sectionId && sectionId === openSectionId;
      toggleClass(shell, "kdb-control_section_open", isOpen);
      toggleClass(head, "kdb-control_section-head_selected", isOpen);
    });
  }

  function syncPanelChrome(dr, isCollapsed, activePanel, openSectionId) {
    toggleClass(dr.rootEl, "kdb-control_collapsed", isCollapsed);
    toggleClass(dr.contentEl, "kdb-control_content_hidden", isCollapsed);
    toggleClass(dr.contentEl, "kdb-control_settings-open", activePanel === "settings");
    Object.keys(PANEL_ELEMENTS).forEach(function (panelId) {
      var isActive = activePanel === panelId;
      toggleClass(dr[PANEL_ELEMENTS[panelId]], "KDB_visible", isActive);
      toggleClass(dr[PANEL_ELEMENTS[panelId]], "kdb-control_selected", isActive);
    });
    if (dr.mainTogglesEl) {
      dr.mainTogglesEl.querySelectorAll("[data-panel-id]").forEach(function (button) {
        toggleClass(button, "kdb-control_selected", button.getAttribute("data-panel-id") === activePanel);
      });
    }
    var settingsButton = dr.rootEl && dr.rootEl.querySelector('[data-header-action="select-settings"]');
    toggleClass(settingsButton, "kdb-control_selected", activePanel === "settings");
    syncSections(dr.toolboxContainerEl, openSectionId);
    syncSections(dr.settingsContainerEl, openSectionId);
  }

  // Writes framework and owner state into the control panel DOM. Called through `runtime.kdbControl.frameworkBindContext.syncView`.
  function syncFrameworkViewFromState(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.kdbControl;
    var framework = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.framework;
    if (!rt || !framework) return;
    var dr = rt.domRefs;
    var isCollapsed = !!framework.isCollapsed;
    syncPanelChrome(dr, isCollapsed, framework.activeTopPanel || "metrics", framework.openSectionId);
    _syncFormControls(_KDB, dr.contentEl);
    if (dr.arrowEl) {
      dr.arrowEl.textContent = isCollapsed ? "\u25b6" : "\u25c0";
      dr.arrowEl.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    }
  }

  return syncFrameworkViewFromState;
});
