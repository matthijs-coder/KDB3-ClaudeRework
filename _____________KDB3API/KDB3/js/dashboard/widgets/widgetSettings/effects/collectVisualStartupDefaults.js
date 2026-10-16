define([
  "../config/selectors.js",
  "../config/dropdownDefaults.js",
  "../config/intentDispatchMap.js",
  "../config/configuredDefaultOptionUtils.js",
  "../config/colorPalette.js",
  "./buildWidgetSettingsIntentDescriptor.js",
  "../view/dropdownOptionSelection.js",
  "../view/resolvePanel.js",
  "../../../canvas/kdbControl/state/selectors.js"
], function (_selectors, _dropdownDefaults, _intentDispatchMap, _optionUtils, _colorPalette, _descriptor, _dropdownOptionSelection, _resolvePanel, _kdbControlSelectors) {
  "use strict";

  const VIS_STARTUP_KINDS = ["backgroundColor", "dimension", "visualization", "topN"];
  const TEXT_STARTUP_KINDS = ["backgroundColor", "fontSize", "layout"];

  function collectVisualStartupDefaults(_KDB, _widgetId, _widgetType) {
    try {
      const widgetId = String(_widgetId || "");
      const widgetType = _widgetType === "text" ? "text" : "live";
      const startupKinds = widgetType === "text" ? TEXT_STARTUP_KINDS : VIS_STARTUP_KINDS;
      const panel = _resolvePanel(_KDB, widgetId);
      const context = panel
        ? _descriptor.panelContext(panel)
        : { widgetId: widgetId, widgetType: widgetType };
      const defaults = [];
      let index = 0;
      while (index < startupKinds.length) {
        const kind = startupKinds[index];
        const descriptor = buildDefaultDescriptor(_KDB, context, panel, kind);
        if (descriptor) {
          defaults.push(descriptor);
        }
        index += 1;
      }
      return defaults;
    } catch (err) {
      console.error("[widgetSettings.collectVisualStartupDefaults] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  function buildDefaultDescriptor(_KDB, _context, _panel, _kind) {
    const kind = _intentDispatchMap.normalizeKind(_kind);
    const option = _panel ? readDefaultOption(_panel, kind) : null;
    let descriptor;
    if (option) {
      descriptor = _descriptor.fromOption(_panel, option);
    } else {
      const fallback = _dropdownDefaults[kind] || _dropdownDefaults[_kind];
      if (!fallback) {
        return null;
      }
      descriptor = _descriptor.fromParts(
        _context,
        kind,
        fallback.key || "",
        fallback.useValue != null ? fallback.useValue : fallback.key || ""
      );
    }
    if (!descriptor || kind !== "backgroundColor") {
      return descriptor;
    }
    try {
      const snapshot = _KDB && _KDB.api && _KDB.api.kdbControl && typeof _KDB.api.kdbControl.getState === "function"
        ? _KDB.api.kdbControl.getState()
        : undefined;
      const isText = _context && _context.widgetType === "text";
      const defaults = isText
        ? _kdbControlSelectors.readCommentDefaults(snapshot)
        : _kdbControlSelectors.readVisualizationDefaults(snapshot);
      const hex = String(defaults.backgroundColor || "").trim();
      if (!hex) {
        return descriptor;
      }
      const colorMap = (_KDB && _KDB.config && _KDB.config.options && _KDB.config.options.color)
        || (_colorPalette && _colorPalette.color)
        || {};
      const keys = Object.keys(colorMap);
      const source = [];
      let index = 0;
      while (index < keys.length) {
        source.push({ key: keys[index], useValue: colorMap[keys[index]] });
        index += 1;
      }
      const matched = _optionUtils.findMatchingOption(source, { useValue: hex });
      return _descriptor.fromParts(
        _context,
        kind,
        matched && matched.key ? matched.key : descriptor.optionKey,
        hex
      );
    } catch (err) {
      console.error("[widgetSettings.buildDefaultDescriptor] kdbControl colour read failed", err);
      return descriptor;
    }
  }

  function readDefaultOption(_panel, _kind) {
    const dropdown = findDropdownByKind(_panel, _kind);
    if (!dropdown) {
      return null;
    }
    const selected = _dropdownOptionSelection.readSelectedOption(dropdown);
    if (selected) {
      return selected;
    }
    const markedDefault = dropdown.querySelector(_selectors.byAttr(_selectors.defaultOptionAttr, "1"));
    if (markedDefault) {
      return markedDefault;
    }
    return dropdown.querySelector(_selectors.dropdownOptionSelector);
  }

  function findDropdownByKind(_panel, _kind) {
    const kind = String(_kind || "");
    if (!_panel || !kind || typeof _panel.querySelector !== "function") {
      return null;
    }
    const dropdowns = _panel.querySelectorAll(_selectors.dropdownSelector);
    let index = 0;
    while (index < dropdowns.length) {
      const dropdown = dropdowns[index];
      if ((_dropdownKind(dropdown) || "") === kind) {
        return dropdown;
      }
      index += 1;
    }
    const optionRow = _panel.querySelector(
      _selectors.dropdownOptionSelector + _selectors.byAttr(_selectors.dropdownKindAttr, kind)
    );
    if (optionRow && typeof optionRow.closest === "function") {
      return optionRow.closest(_selectors.dropdownSelector);
    }
    return null;
  }

  function _dropdownKind(dropdown) {
    return _intentDispatchMap.normalizeKind(dropdown.getAttribute(_selectors.dropdownKindAttr) || "");
  }

  return collectVisualStartupDefaults;
});
