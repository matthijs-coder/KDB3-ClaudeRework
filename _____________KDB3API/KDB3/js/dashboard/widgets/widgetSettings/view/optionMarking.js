define([
  "../config/selectors.js",
  "../config/dropdownDefaults.js",
  "../state/ensureWidgetSettingsByWidget.js",
  "../../widgetVis/config/resolveVisualizationBindingConfig.js",
  "./dropdownOptionSelection.js",
  "./resolveWidgetPlacementContext.js"
], function (_selectors, _dropdownDefaults, _ensureByWidget, _resolveVisualizationBindingConfig, _dropdownOptionSelection, _placementContext) {
  "use strict";

  var SETTINGS_VIS_KEYS = {
    line: "line",
    pie: "pie",
    stackedbar: "stackedbar",
    stackedcolumn: "stackedcolumn",
    list: "list",
    "com.ibm.vis.custom.prognoseyear": "prognose",
    "com.ibm.vis.custom.prognoseyearlinechart": "prognose",
    prognose: "prognose"
  };
  var GRAINS = { stichtag: 1, jahr: 1, jahrStichtag: 1, stichtagProJahrH: 1, stichtagProJahrV: 1 };

  function findOptionByChoice(dropdown, choice) {
    return dropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, choice))
      || dropdown.querySelector(_selectors.byAttr(_selectors.optionValueAttr, choice));
  }

  function findKindDropdown(root, kind) {
    return root.querySelector(_selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, kind));
  }

  function markPanelOption(panel, kind, optionKey, fallbackSelector) {
    const dropdown = findKindDropdown(panel, kind) || (fallbackSelector ? panel.querySelector(fallbackSelector) : null);
    if (!dropdown) {
      return;
    }
    _dropdownOptionSelection.selectHostOption(dropdown, findOptionByChoice(dropdown, optionKey));
  }

  function readFlagKey(value) {
    return typeof value === "boolean" ? (value ? "on" : "off") : "inherit";
  }

  function readDimensionKey(record) {
    return record && record.dimension != null && String(record.dimension).trim() !== "" ? String(record.dimension) : "none";
  }

  function readTopNKey(record) {
    return record && record.topNChoice != null && String(record.topNChoice).trim() !== ""
      ? String(record.topNChoice)
      : String(_dropdownDefaults.topN.useValue || "none");
  }

  function markDimensionAndTopN(panel, record) {
    markPanelOption(panel, "dimension", readDimensionKey(record), ".KDB_dimensionsContainer");
    markPanelOption(panel, "topN", readTopNKey(record), ".KDB_topNContainer");
  }

  function markFocusDimensionAndTopNFromRecord(_KDB, widgetId) {
    const id = String(widgetId || "");
    const focusPanel = document.querySelector(_selectors.byAttr(_selectors.focusPanelRootAttr, id));
    if (!focusPanel) {
      return;
    }
    markDimensionAndTopN(focusPanel, id ? _ensureByWidget(_KDB, id) : null);
  }

  function resolveStampPanel(_KDB, panelOrWidgetId) {
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.widgetSettings : null;
    var refs = runtime && runtime.domRefs ? runtime.domRefs[String(panelOrWidgetId || "")] : null;
    if (panelOrWidgetId && typeof panelOrWidgetId.querySelector === "function") {
      return panelOrWidgetId.classList && panelOrWidgetId.classList.contains(_selectors.panelRootClass)
        ? panelOrWidgetId
        : (panelOrWidgetId.querySelector(_selectors.panelRootSelector) || panelOrWidgetId);
    }
    return refs && refs.panel ? refs.panel : null;
  }

  function resolveStampVisTypeKey(record) {
    var raw = record && record.visType != null && String(record.visType).trim() !== ""
      ? String(record.visType).trim()
      : String(_dropdownDefaults.visualization.useValue || "line");
    return SETTINGS_VIS_KEYS[raw.toLowerCase()] || raw;
  }

  function stampMatchingFocusCloneVisType(widgetId, visTypeKey) {
    var id = String(widgetId || "");
    var focusPanel = id ? document.querySelector(_selectors.byAttr(_selectors.focusPanelRootAttr, id)) : null;
    if (focusPanel) {
      focusPanel.setAttribute(_selectors.panelVisTypeAttr, visTypeKey);
    }
  }

  function isAllowedGrain(bucket, grain) {
    if (bucket === "List") {
      return grain === "jahr" || grain === "jahrStichtag";
    }
    if (bucket === "pie" || bucket === "StackedBar" || bucket === "StackedColumn") {
      return grain === "jahr" || grain === "jahrStichtag" || grain === "stichtagProJahrH" || grain === "stichtagProJahrV";
    }
    return bucket !== "com.ibm.vis.custom.prognoseyearlinechart" && !!GRAINS[grain];
  }

  function clearIllegalGrouping(record, _KDB) {
    if (record && GRAINS[record.grouping] && !isAllowedGrain(_resolveVisualizationBindingConfig.resolveVisPropBucketKey(record.visType, _KDB), record.grouping)) {
      delete record.grouping;
      delete record.groupingMeta;
    }
  }

  function hideDisallowedGroupingRows(panel, visType, _KDB) {
    var dropdown = panel.querySelector(".KDB_groupingContainer");
    var rows = dropdown ? dropdown.querySelectorAll(_selectors.dropdownOptionSelector) : [];
    var bucket = _resolveVisualizationBindingConfig.resolveVisPropBucketKey(visType, _KDB);
    Array.prototype.forEach.call(rows, function (row) {
      var token = row.getAttribute(_selectors.optionKeyAttr) || row.getAttribute(_selectors.optionValueAttr) || "";
      row.style.display = token === "inherit" || token === "Diagrammstandard" || !GRAINS[token] || isAllowedGrain(bucket, token) ? "" : "none";
    });
  }

  function stampPanelState(_KDB, panel, widgetId) {
    var record = widgetId ? _ensureByWidget(_KDB, widgetId) : null;
    var visTypeKey = resolveStampVisTypeKey(record);
    panel.setAttribute(_selectors.panelVisTypeAttr, visTypeKey);
    stampMatchingFocusCloneVisType(widgetId, visTypeKey);
    markPanelOption(panel, "showValues", readFlagKey(record && record.showValues), ".KDB_showValuesContainer");
    markPanelOption(panel, "iterator", readFlagKey(record && record.iterator));
    markPanelOption(panel, "zoom", readFlagKey(record && record.zoom));
    markPanelOption(panel, "valueCaption", readFlagKey(record && record.valueCaption));
    markPanelOption(panel, "visualization", visTypeKey, ".KDB_visualizationsContainer");
    markDimensionAndTopN(panel, record);
    clearIllegalGrouping(record, _KDB);
    hideDisallowedGroupingRows(panel, (record && record.visType) || visTypeKey, _KDB);
    if (record) {
      markPanelOption(panel, "grouping", GRAINS[record.grouping] ? record.grouping : "inherit", ".KDB_groupingContainer");
    }
  }

  function stampPanelVisType(_KDB, panelOrWidgetId) {
    try {
      var panel = resolveStampPanel(_KDB, panelOrWidgetId);
      if (!panel) {
        return;
      }
      var widgetId = typeof panel.getAttribute === "function"
        ? String(panel.getAttribute(_selectors.panelRootAttr) || "")
        : String(panelOrWidgetId || "");
      stampPanelState(_KDB, panel, widgetId);
    } catch (err) {
      console.error("[widgetSettings.stampPanelVisType]", err);
    }
  }

  function markDropdownPending(_KDB, widgetId, kind, isPending) {
    const panel = _placementContext.resolvePanel(_KDB, widgetId);
    const icon = panel ? panel.querySelector(_selectors.byAttr(_selectors.settingsIconKindAttr, kind)) : null;
    if (icon) {
      icon.classList.toggle(_selectors.dropdownPendingClass, isPending === true);
    }
  }

  function revertDropdownFromState(_KDB, widgetId, kind, readChoice) {
    const panel = _placementContext.resolvePanel(_KDB, widgetId);
    const dropdown = panel ? findKindDropdown(panel, kind) : null;
    if (!dropdown) {
      return false;
    }
    const choice = readChoice(_ensureByWidget(_KDB, widgetId));
    const option = findOptionByChoice(dropdown, choice);
    if (option) {
      _dropdownOptionSelection.markSelectedOption(option);
      const focusPanel = document.querySelector(_selectors.byAttr(_selectors.focusPanelRootAttr, widgetId));
      const focusDropdown = focusPanel ? findKindDropdown(focusPanel, kind) : null;
      const focusOption = focusDropdown ? findOptionByChoice(focusDropdown, choice) : null;
      if (focusOption) {
        _dropdownOptionSelection.markSelectedOption(focusOption);
      }
    }
    markDropdownPending(_KDB, widgetId, kind, false);
    return !!option;
  }

  function markTopNPending(_KDB, widgetId, isPending) {
    markDropdownPending(_KDB, widgetId, "topN", isPending);
  }

  function revertTopNDropdownFromState(_KDB, widgetId) {
    return revertDropdownFromState(_KDB, String(widgetId || ""), "topN", function (record) {
      return record.topNChoice != null ? String(record.topNChoice) : String(_dropdownDefaults.topN.useValue || "none");
    });
  }

  function markShowValuesPending(_KDB, widgetId, isPending) {
    try {
      markDropdownPending(_KDB, widgetId, "showValues", isPending);
    } catch (err) {
      console.error("[widgetSettings.markShowValuesPending]", err);
    }
  }

  function revertShowValuesDropdownFromState(_KDB, widgetId) {
    try {
      return revertDropdownFromState(_KDB, String(widgetId || ""), "showValues", function (record) {
        return readFlagKey(record && record.showValues);
      });
    } catch (err) {
      console.error("[widgetSettings.revertShowValuesDropdownFromState]", err);
      return false;
    }
  }

  return {
    markPanelOption: markPanelOption,
    markFocusDimensionAndTopNFromRecord: markFocusDimensionAndTopNFromRecord,
    stampPanelVisType: stampPanelVisType,
    markTopNPending: markTopNPending,
    revertTopNDropdownFromState: revertTopNDropdownFromState,
    markShowValuesPending: markShowValuesPending,
    revertShowValuesDropdownFromState: revertShowValuesDropdownFromState
  };
});
