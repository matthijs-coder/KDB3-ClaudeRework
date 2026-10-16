define([
  "../config/selectors.js",
  "../state/ensureWidgetSettingsByWidget.js",
  "../config/dropdownDefaults.js",
  "../../widgetVis/config/resolveVisualizationBindingConfig.js",
  "./markPanelOption.js"
], function (_selectors, _ensureWidgetSettingsByWidget, _dropdownDefaults, _resolveVisualizationBindingConfig, _markPanelOption) {
  "use strict";

  var SETTINGS_VIS_KEYS = { line: "line", pie: "pie", stackedbar: "stackedbar", stackedcolumn: "stackedcolumn", list: "list", "com.ibm.vis.custom.prognoseyear": "prognose", "com.ibm.vis.custom.prognoseyearlinechart": "prognose", prognose: "prognose" };
  var GRAINS = { stichtag: 1, jahr: 1, jahrStichtag: 1, stichtagProJahrH: 1, stichtagProJahrV: 1 };

  function stampPanelVisType(_KDB, _panelOrWidgetId) {
    try {
      var panel = resolveStampPanel(_KDB, _panelOrWidgetId);
      var widgetId, record, visTypeKey;
      if (!panel) {
        return;
      }
      widgetId = typeof panel.getAttribute === "function"
        ? String(panel.getAttribute(_selectors.panelRootAttr) || "")
        : String(_panelOrWidgetId || "");
      record = widgetId ? _ensureWidgetSettingsByWidget(_KDB, widgetId) : null;
      visTypeKey = resolveStampVisTypeKey(record);
      panel.setAttribute(_selectors.panelVisTypeAttr, visTypeKey);
      stampMatchingFocusCloneVisType(widgetId, visTypeKey);
      markShowValuesOption(panel, record && typeof record.showValues === "boolean" ? (record.showValues ? "on" : "off") : "inherit");
      _markPanelOption(panel, "iterator", record && typeof record.iterator === "boolean" ? (record.iterator ? "on" : "off") : "inherit");
      _markPanelOption(panel, "zoom", record && typeof record.zoom === "boolean" ? (record.zoom ? "on" : "off") : "inherit");
      _markPanelOption(panel, "valueCaption", record && typeof record.valueCaption === "boolean" ? (record.valueCaption ? "on" : "off") : "inherit");
      _markPanelOption(panel, "visualization", visTypeKey, ".KDB_visualizationsContainer");
      _markPanelOption(panel, "dimension", record && record.dimension != null && String(record.dimension).trim() !== "" ? String(record.dimension) : "none", ".KDB_dimensionsContainer");
      _markPanelOption(panel, "topN", record && record.topNChoice != null && String(record.topNChoice).trim() !== "" ? String(record.topNChoice) : String(_dropdownDefaults.topN.useValue || "none"), ".KDB_topNContainer");
      clearIllegalGrouping(record, _KDB);
      hideDisallowedGroupingRows(panel, (record && record.visType) || visTypeKey, _KDB);
      if (record && GRAINS[record.grouping]) {
        markGroupingOption(panel, record.grouping);
      } else if (record) {
        markGroupingOption(panel, "inherit");
      }
    } catch (err) {
      console.error("[widgetSettings.stampPanelVisType]", err);
    }
  }

  function resolveStampPanel(_KDB, _panelOrWidgetId) {
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.widgetSettings : null;
    var refs = runtime && runtime.domRefs ? runtime.domRefs[String(_panelOrWidgetId || "")] : null;
    if (_panelOrWidgetId && typeof _panelOrWidgetId.querySelector === "function") {
      return _panelOrWidgetId.classList && _panelOrWidgetId.classList.contains(_selectors.panelRootClass)
        ? _panelOrWidgetId
        : (_panelOrWidgetId.querySelector(_selectors.panelRootSelector) || _panelOrWidgetId);
    }
    return refs && refs.panel ? refs.panel : null;
  }

  function stampMatchingFocusCloneVisType(_widgetId, _visTypeKey) {
    var id = String(_widgetId || "");
    var focusPanel;
    if (!id) {
      return;
    }
    focusPanel = document.querySelector(_selectors.byAttr(_selectors.focusPanelRootAttr, id));
    if (!focusPanel) {
      return;
    }
    focusPanel.setAttribute(_selectors.panelVisTypeAttr, _visTypeKey);
  }

  function resolveStampVisTypeKey(_record) {
    var raw = _record && _record.visType != null && String(_record.visType).trim() !== ""
      ? String(_record.visType).trim()
      : String(_dropdownDefaults.visualization.useValue || "line");
    return SETTINGS_VIS_KEYS[raw.toLowerCase()] || raw;
  }

  function markShowValuesOption(_panel, _optionKey) {
    _markPanelOption(_panel, "showValues", _optionKey, ".KDB_showValuesContainer");
  }

  function markGroupingOption(_panel, _token) {
    _markPanelOption(_panel, "grouping", _token, ".KDB_groupingContainer");
  }

  function isAllowedGrain(_bucket, _grain) {
    if (_bucket === "List") { return _grain === "jahr" || _grain === "jahrStichtag"; }
    if (_bucket === "pie" || _bucket === "StackedBar" || _bucket === "StackedColumn") {
      return _grain === "jahr" || _grain === "jahrStichtag" || _grain === "stichtagProJahrH" || _grain === "stichtagProJahrV";
    }
    return _bucket !== "com.ibm.vis.custom.prognoseyearlinechart" && !!GRAINS[_grain];
  }

  function clearIllegalGrouping(_record, _KDB) {
    if (_record && GRAINS[_record.grouping] && !isAllowedGrain(_resolveVisualizationBindingConfig.resolveVisPropBucketKey(_record.visType, _KDB), _record.grouping)) {
      delete _record.grouping;
      delete _record.groupingMeta;
    }
  }

  function hideDisallowedGroupingRows(_panel, _visType, _KDB) {
    var dropdown = _panel.querySelector(".KDB_groupingContainer");
    var rows = dropdown ? dropdown.querySelectorAll(_selectors.dropdownOptionSelector) : [];
    var bucket = _resolveVisualizationBindingConfig.resolveVisPropBucketKey(_visType, _KDB);
    var index = 0;
    var token;
    while (index < rows.length) {
      token = rows[index].getAttribute(_selectors.optionKeyAttr) || rows[index].getAttribute(_selectors.optionValueAttr) || "";
      rows[index].style.display = token === "inherit" || token === "Diagrammstandard" || !GRAINS[token] || isAllowedGrain(bucket, token) ? "" : "none";
      index += 1;
    }
  }

  return stampPanelVisType;
});
