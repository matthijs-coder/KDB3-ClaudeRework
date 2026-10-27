define([
  "../config/selectors.js",
  "../../../../core/config/dropdownDefaults.js",
  "../state.js",
  "../../widgetVis/selectors.js",
  "../../../../core/config/visualizations/visTypeRules.js",
  "./dropdownOptionSelection.js",
  "./resolveWidgetPlacementContext.js"
], function (_selectors, _dropdownDefaults, _state, _visSelectors, _visTypeRules, _dropdownOptionSelection, _placementContext) {
  "use strict";

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
    return _visTypeRules.settingsKey(raw);
  }

  function stampDimensionAvailability(panel, visType) {
    if (_visTypeRules.supportsDimension(visType)) {
      panel.removeAttribute(_selectors.panelDimensionAttr);
    } else {
      panel.setAttribute(_selectors.panelDimensionAttr, "off");
    }
  }

  function markCommittedOptions(panel, record) {
    var visTypeKey = resolveStampVisTypeKey(record);
    markPanelOption(panel, "showValues", readFlagKey(record && record.showValues), ".KDB_showValuesContainer");
    markPanelOption(panel, "iterator", readFlagKey(record && record.iterator));
    markPanelOption(panel, "zoom", readFlagKey(record && record.zoom));
    markPanelOption(panel, "valueCaption", readFlagKey(record && record.valueCaption));
    markPanelOption(panel, "visualization", visTypeKey, ".KDB_visualizationsContainer");
    markDimensionAndTopN(panel, record);
    if (record) {
      var groupingKey = _visTypeRules.isGrain(record.grouping) ? record.grouping : "inherit";
      markPanelOption(panel, "grouping", groupingKey, ".KDB_groupingContainer");
    }
  }

  function stampMatchingFocusCloneVisType(widgetId, visTypeKey, visTypeRaw) {
    var id = String(widgetId || "");
    var focusPanel = id ? document.querySelector(_selectors.byAttr(_selectors.focusPanelRootAttr, id)) : null;
    if (!focusPanel) {
      return null;
    }
    focusPanel.setAttribute(_selectors.panelVisTypeAttr, visTypeKey);
    stampDimensionAvailability(focusPanel, visTypeRaw || visTypeKey);
    return focusPanel;
  }

  function clearIllegalGrouping(record, _KDB) {
    if (!record || record.grouping == null) {
      return;
    }
    var bucket = _visSelectors.readVisPropBucketKey(_KDB, record.visType);
    if (!_visTypeRules.isAllowedGrain(bucket, record.grouping)) {
      delete record.grouping;
      delete record.groupingMeta;
    }
  }

  function hideDisallowedGroupingRows(panel, visType, _KDB) {
    var dropdown = panel.querySelector(".KDB_groupingContainer");
    var rows = dropdown ? dropdown.querySelectorAll(_selectors.dropdownOptionSelector) : [];
    var bucket = _visSelectors.readVisPropBucketKey(_KDB, visType);
    Array.prototype.forEach.call(rows, function (row) {
      var token = row.getAttribute(_selectors.optionKeyAttr) || row.getAttribute(_selectors.optionValueAttr) || "";
      var isGrainRow = _visTypeRules.isGrain(token) && token !== "inherit";
      row.style.display = isGrainRow && !_visTypeRules.isAllowedGrain(bucket, token) ? "none" : "";
    });
  }

  function stampPanelState(_KDB, panel, widgetId) {
    var record = widgetId ? _state.ensureWidgetSettingsByWidget(_KDB, widgetId) : null;
    var visTypeKey = resolveStampVisTypeKey(record);
    var visTypeRaw = (record && record.visType) || visTypeKey;
    panel.setAttribute(_selectors.panelVisTypeAttr, visTypeKey);
    stampDimensionAvailability(panel, visTypeRaw);
    var focusPanel = stampMatchingFocusCloneVisType(widgetId, visTypeKey, visTypeRaw);
    clearIllegalGrouping(record, _KDB);
    var groupingVisType = (record && record.visType) || visTypeKey;
    hideDisallowedGroupingRows(panel, groupingVisType, _KDB);
    if (focusPanel) {
      hideDisallowedGroupingRows(focusPanel, groupingVisType, _KDB);
    }
    markCommittedOptions(panel, record);
    if (focusPanel) {
      markCommittedOptions(focusPanel, record);
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
    const choice = readChoice(_state.ensureWidgetSettingsByWidget(_KDB, widgetId));
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
    markDropdownPending(_KDB, widgetId, "showValues", isPending);
  }

  function revertShowValuesDropdownFromState(_KDB, widgetId) {
    return revertDropdownFromState(_KDB, String(widgetId || ""), "showValues", function (record) {
      return readFlagKey(record && record.showValues);
    });
  }

  return {
    stampPanelVisType: stampPanelVisType,
    markTopNPending: markTopNPending,
    revertTopNDropdownFromState: revertTopNDropdownFromState,
    markShowValuesPending: markShowValuesPending,
    revertShowValuesDropdownFromState: revertShowValuesDropdownFromState
  };
});
