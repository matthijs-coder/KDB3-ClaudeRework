define([
  "./createFrameworkElement.js",
  "./primitives/colorField.js",
  "./primitives/toggleSwitch.js",
  "./primitives/formRows.js",
  "./settingsRows.js",
  "../config/settingsDefaults.js",
  "../config/labels.js",
  "../config/icons.js"
], function (_createElement, _colorField, _toggleSwitch, _formRows, _rows, _defaults, _labels, _icons) {
  "use strict";

  var DIMENSIONS = _defaults.dimensions;
  var TEXTS = _labels.settings;

  function buildDashboardSection(body, _KDB) {
    body.classList.add("kdb-control_settings-body--dashboard");
    body.appendChild(_rows.buildDimensionInputs(DIMENSIONS.dashboard.width, DIMENSIONS.dashboard.height, "dashboardWidth", "dashboardHeight"));
    var row = _rows.createTwoInputRow("kdb-control_settings-inline-row--dashboard-row2");
    var developerToggle = _toggleSwitch.createToggleSwitch({
      label: "",
      action: "dashboard.developerMode.toggle",
      checked: false,
      ariaLabel: TEXTS.developerMode,
      title: TEXTS.developerMode
    });
    var togglePair = _createElement("div", null, "kdb-control_dashboard-toggle-pair", null);
    togglePair.appendChild(developerToggle);
    var column = _rows.createSettingsChromeBlock(TEXTS.developerMode, togglePair);
    column.classList.add("kdb-control_dashboard-toggles-column", "kdb-control_dashboard-toggles-column--developer-mode-gated");
    _rows.appendTwoInputSplit(row, _colorField.createColorInput(TEXTS.backgroundColor, "dashboardBg", _KDB), column);
    body.appendChild(row);
  }

  function buildChartsSection(body, _KDB) {
    body.appendChild(_rows.buildDimensionInputs(DIMENSIONS.visualization.width, DIMENSIONS.visualization.height, "graphWidth", "graphHeight"));
    var row = _rows.createTwoInputRow("kdb-control_diagram-bg-chrome-row");
    var togglePair = _createElement("div", null, "kdb-control_dashboard-toggle-pair", null);
    togglePair.appendChild(_toggleSwitch.createToggleSwitch({
      iconSrc: _icons.readIconSrc(_KDB, "kdbControlHeaderIconSettingsSrc"),
      ariaLabel: TEXTS.hideSettingsButtons,
      action: "dashboard.settingsButtons.toggle",
      checked: false
    }));
    var column = _rows.createSettingsChromeBlock(TEXTS.hideButtonsCaption, togglePair);
    column.classList.add("kdb-control_dashboard-toggles-column", "kdb-control_dashboard-toggles-column--diagram-chrome");
    _rows.appendTwoInputSplit(row, _colorField.createColorInput(TEXTS.backgroundColor, "graphBg", _KDB), column);
    body.appendChild(row);
  }

  function buildCommentsSection(body, _KDB) {
    body.appendChild(_rows.buildDimensionInputs(DIMENSIONS.comment.width, DIMENSIONS.comment.height, "commentWidth", "commentHeight"));
    var row = _rows.createOneInputRow();
    row.appendChild(_colorField.createColorInput(TEXTS.backgroundColor, "commentBg", _KDB));
    body.appendChild(row);
  }

  function buildControlPanelSection(body, _KDB) {
    var colorRow = _rows.createTwoInputRow();
    var caption = _createElement("div", null, "kdb-control_subheading", null);
    caption.textContent = TEXTS.colorCaption;
    colorRow.appendChild(caption);
    _rows.appendTwoInputSplit(colorRow,
      _colorField.createColorInput(TEXTS.panelBackground, "panelBg", _KDB),
      _colorField.createColorInput(TEXTS.panelInner, "panelInnerBg", _KDB));
    body.appendChild(colorRow);
    var buttonRow = _rows.createTwoInputRow();
    _rows.appendTwoInputSplit(buttonRow,
      _colorField.createColorInput(TEXTS.panelButtons, "panelButton", _KDB),
      _colorField.createColorInput(TEXTS.panelActionButtons, "panelActionButton", _KDB));
    body.appendChild(buttonRow);
  }

  function buildSettingsPanel(_KDB) {
    var sections = _labels.sections;
    var panel = _createElement("div", "kdb-control_settings_container", "kdb-control__panel kdb-control__panel-settings", null);
    panel.appendChild(_formRows.createExpandableSection("settingsDashboard", sections.settingsDashboard, buildDashboardSection, _KDB));
    panel.appendChild(_formRows.createExpandableSection("settingsCharts", sections.settingsCharts, buildChartsSection, _KDB));
    panel.appendChild(_formRows.createExpandableSection("settingsComments", sections.settingsComments, buildCommentsSection, _KDB));
    panel.appendChild(_formRows.createExpandableSection("settingsControlPanel", sections.settingsControlPanel, buildControlPanelSection, _KDB));
    return panel;
  }

  return buildSettingsPanel;
});
