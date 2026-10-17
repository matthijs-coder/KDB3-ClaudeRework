define([
  "../config/settingsInputs.js",
  "../config/labels.js",
  "../../../header/state/selectors.js",
  "../../../footer/state/selectors.js"
], function (_settingsInputs, _labels, _headerSelectors, _footerSelectors) {
  "use strict";

  var TAB_EDIT_LINE_COUNT = _labels.toolbox.tabEditCount;

  function readKdbControlState(_KDB) {
    return _KDB.state && _KDB.state.kdbControl;
  }

  function toggleClass(el, className, isOn) {
    if (el) el.classList.toggle(className, !!isOn);
  }

  function readTabsState(_KDB) {
    var tabsApi = _KDB.api && _KDB.api.tabs;
    if (!tabsApi) return null;
    var state;
    try {
      state = tabsApi.getState();
    } catch (err) {
      var warned = _KDB.runtime && _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.warnedMissingApis;
      if (!warned || warned.tabsGetState !== true) {
        if (warned) warned.tabsGetState = true;
        console.warn("[kdbControl.syncFormControls] tabs.getState failed; tab edit sync skipped", err);
      }
      return null;
    }
    return state && typeof state === "object" ? state : null;
  }

  function syncPlaceholderState(_KDB, gallery) {
    var framework = readKdbControlState(_KDB) && readKdbControlState(_KDB).framework;
    if (!framework) return;
    var inputValues = framework.placeholderInputs || {};
    var selections = framework.placeholderSelections || {};
    var hasTabsOwner = !!(_KDB.api && _KDB.api.tabs);
    gallery.querySelectorAll("[data-placeholder-input-id]").forEach(function (inputEl) {
      var id = inputEl.getAttribute("data-placeholder-input-id");
      if (id && Object.prototype.hasOwnProperty.call(inputValues, id)) inputEl.value = inputValues[id];
    });
    gallery.querySelectorAll(".kdb-control__gallery-row-radio[data-placeholder-control-id]").forEach(function (group) {
      var controlId = group.getAttribute("data-placeholder-control-id");
      if (controlId === "headerEditMode" || (controlId === "tabEditActions" && hasTabsOwner)) return;
      var selected = controlId ? selections[controlId] : null;
      group.querySelectorAll('input[type="radio"]').forEach(function (radio) {
        radio.checked = selected != null && radio.value === String(selected);
      });
    });
  }

  function syncSettingsBoundInputs(_KDB, gallery) {
    var settings = readKdbControlState(_KDB) && readKdbControlState(_KDB).settings;
    gallery.querySelectorAll("[data-placeholder-input-id]").forEach(function (inputEl) {
      var id = inputEl.getAttribute("data-placeholder-input-id");
      if (id && _settingsInputs.isSettingsInput(id)) inputEl.value = _settingsInputs.readSettingsInputValue(settings, id);
    });
  }

  function syncHeaderEditModeRadios(_KDB, gallery) {
    var row = gallery.querySelector('.kdb-control__gallery-row-radio[data-placeholder-control-id="headerEditMode"]');
    if (!row) return;
    var target = _headerSelectors.readHeaderEditTarget(_KDB);
    var value = target === "title" ? "renameHeader" : target === "subtitle" ? "renameHeaderSubtitle" : null;
    row.querySelectorAll('input[type="radio"]').forEach(function (radio) {
      radio.checked = value != null && radio.value === value;
    });
  }

  function syncTabEditArea(gallery, tabsState) {
    var area = gallery.querySelector(".kdb-control_tab-edit-area");
    if (!area) return;
    var visible = !!(tabsState.editUi && tabsState.editUi.toolboxVisible === true);
    toggleClass(area, "KDB_visible", visible);
    area.hidden = !visible;
    var radioHost = area.querySelector(".kdb-control_tab-edit-placeholder");
    if (!radioHost) return;
    var visibleIndexes = {};
    var editIndexes = tabsState.editUi && Array.isArray(tabsState.editUi.visibleEditTabIndexes) ? tabsState.editUi.visibleEditTabIndexes : null;
    if (editIndexes) {
      editIndexes.forEach(function (index) { visibleIndexes[index] = true; });
    } else if (Array.isArray(tabsState.visibleTabs)) {
      tabsState.visibleTabs.forEach(function (tab) {
        if (tab && typeof tab.index === "number") visibleIndexes[tab.index] = true;
      });
    }
    radioHost.querySelectorAll('input[type="radio"][data-tab-index]').forEach(function (radio) {
      var index = parseInt(radio.getAttribute("data-tab-index"), 10);
      var show = !isNaN(index) && visibleIndexes[index] === true;
      var label = radio.closest("label");
      radio.hidden = !show;
      if (label) {
        label.hidden = !show;
        toggleClass(label, "KDB_hidden", !show);
      }
    });
  }

  function syncTabEditRadios(gallery, tabsState) {
    var radioHost = gallery.querySelector(".kdb-control_tab-edit-placeholder");
    if (!radioHost) return;
    var line = tabsState.toolboxTabEditLineIndex;
    var isValid = typeof line === "number" && line === Math.floor(line) && line >= 0 && line < TAB_EDIT_LINE_COUNT;
    radioHost.querySelectorAll('input[type="radio"][data-tab-index]').forEach(function (radio) {
      var index = parseInt(radio.getAttribute("data-tab-index"), 10);
      radio.checked = isValid && !isNaN(index) && index === line;
    });
  }

  function syncSwitchCheckboxes(_KDB, gallery) {
    var state = readKdbControlState(_KDB);
    var dashboard = state && state.settings && state.settings.dashboard;
    var selections = (state && state.framework && state.framework.placeholderSelections) || null;
    gallery.querySelectorAll('input.kdb-control_switch-input[type="checkbox"][data-kdb-action]').forEach(function (checkbox) {
      var action = checkbox.getAttribute("data-kdb-action");
      if (action === "header.toggle") checkbox.checked = _headerSelectors.readHeaderStatus(_KDB) === "active";
      else if (action === "footer.toggle") checkbox.checked = _footerSelectors.readFooterStatus(_KDB) === "active";
      else if (action === "header.subtitle.toggle") checkbox.checked = _headerSelectors.readHeaderSubtitleVisible(_KDB);
      else if (action === "dashboard.settingsButtons.toggle") checkbox.checked = !!(dashboard && dashboard.hideWidgetSettingsButtons);
      else if (action === "dashboard.developerMode.toggle") checkbox.checked = !!(dashboard && dashboard.isDeveloperMode);
      else if (state && state.framework && action && Object.prototype.hasOwnProperty.call(selections || {}, action)) {
        checkbox.checked = selections[action] === "1" || selections[action] === "true";
      }
    });
  }

  // Writes owner and framework state into the inputs, radios and switches below `gallery` (the control panel content).
  function syncFormControls(_KDB, gallery) {
    if (!gallery) return;
    syncPlaceholderState(_KDB, gallery);
    syncSettingsBoundInputs(_KDB, gallery);
    syncHeaderEditModeRadios(_KDB, gallery);
    var tabsState = readTabsState(_KDB);
    if (tabsState) {
      syncTabEditArea(gallery, tabsState);
      syncTabEditRadios(gallery, tabsState);
    }
    syncSwitchCheckboxes(_KDB, gallery);
  }

  return syncFormControls;
});
