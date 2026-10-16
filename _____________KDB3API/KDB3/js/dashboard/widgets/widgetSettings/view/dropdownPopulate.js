define([
  "../../../../core/config/colorPalette.js",
  "../../../../core/config/dimensions.js",
  "../config.js",
  "../../../../core/config/dropdownDefaults.js",
  "../config/selectors.js"
], function (_colorPalette, _dimensionsConfig, _config, _dropdownDefaults, _selectors) {
  const applyConfiguredDefault = _config.applyConfiguredDefault;
  const isOptionInitiallySelected = _config.isOptionInitiallySelected;
  const SHOW_VALUES_NESTS = [
    { kind: "iterator", phrase: "Iterator" },
    { kind: "zoom", phrase: "Zoomleiste" },
    { kind: "valueCaption", phrase: "Werte beschriftung" }
  ];

  function readDisplayLabel(option, useValue) {
    return String(option.displayValue || option.label || option.key || useValue || "");
  }

  function readUseValue(option) {
    if (option.useValue != null) {
      return option.useValue;
    }
    if (option.value != null) {
      return option.value;
    }
    return option.key == null ? "" : option.key;
  }

  function readOptionKey(option, displayLabel) {
    return String(option.key || displayLabel || option.label || "");
  }

  function buildOptionTitle(label, value) {
    return label === value ? label : label + " (" + value + ")";
  }

  function appendOptionContent(_KDB, row, option, displayLabel, useValue, isColor) {
    if (isColor) {
      row.style.backgroundColor = String(useValue);
      row.style.color = _KDB.utils.readableTextColorForHex(String(useValue));
      row.textContent = displayLabel + " " + useValue;
      return;
    }
    if (option.icon) {
      const image = document.createElement("input");
      image.type = "image";
      image.className = _selectors.svgIconClass;
      image.src = _config.readImagePath() + String(option.icon);
      image.alt = String(displayLabel);
      image.setAttribute("title", String(displayLabel));
      row.appendChild(image);
    }
    const text = document.createElement("span");
    text.className = _selectors.textIconClass;
    text.textContent = displayLabel;
    row.appendChild(text);
  }

  function buildDropdownOption(_KDB, option, kind, isColor, isSelected) {
    const row = document.createElement("div");
    const useValue = readUseValue(option);
    const displayLabel = readDisplayLabel(option, useValue);
    row.className = isColor ? _selectors.dataWidgetIconClass + " KDB_widgetSettings_colorOption" : _selectors.dataWidgetIconClass;
    if (option.icon) {
      row.className += " KDB_widgetSettings_iconTextOption";
    }
    if (isSelected) {
      row.classList.add(_selectors.optionSelectedClass);
    }
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-label", displayLabel);
    row.setAttribute(_selectors.dropdownKindAttr, String(kind));
    row.setAttribute(_selectors.optionKeyAttr, readOptionKey(option, displayLabel));
    row.setAttribute(_selectors.optionValueAttr, String(useValue));
    if (option.isDefault === true) {
      row.setAttribute(_selectors.defaultOptionAttr, "1");
    }
    row.setAttribute("title", buildOptionTitle(displayLabel, useValue));
    appendOptionContent(_KDB, row, option, displayLabel, useValue, isColor);
    return row;
  }

  function isSparedNestNode(node) {
    return !!(node && node.nodeType === 1 && node.getAttribute("data-kdb-showvalues-row"));
  }

  function clearDropdownChildren(dropdown) {
    let node = dropdown.firstChild;
    while (node) {
      const next = node.nextSibling;
      if (!isSparedNestNode(node)) {
        dropdown.removeChild(node);
      }
      node = next;
    }
  }

  function queryHostOption(dropdown, selector) {
    return Array.prototype.find.call(dropdown.children, function (node) {
      return !!(node.matches && node.matches(selector));
    }) || null;
  }

  function ensureDropdownSelected(dropdown) {
    const defaultOption = queryHostOption(dropdown, _selectors.byAttr(_selectors.defaultOptionAttr, "1"));
    const first = queryHostOption(dropdown, _selectors.dropdownOptionSelector);
    const selected = queryHostOption(dropdown, "." + _selectors.optionSelectedClass);
    if (!selected && (defaultOption || first)) {
      (defaultOption || first).classList.add(_selectors.optionSelectedClass);
    }
  }

  function findSparedRowNode(dropdown, kind, className) {
    return Array.prototype.find.call(dropdown.children, function (node) {
      return node.getAttribute("data-kdb-showvalues-row") === kind && node.classList.contains(className);
    }) || null;
  }

  function ensureToggleNest(dropdown, kind, phraseText) {
    if (!findSparedRowNode(dropdown, kind, "KDB_showValuesRowPhrase")) {
      const phrase = document.createElement("div");
      phrase.className = "KDB_showValuesRowPhrase";
      phrase.setAttribute("data-kdb-showvalues-row", kind);
      phrase.textContent = phraseText;
      dropdown.appendChild(phrase);
    }
    if (!findSparedRowNode(dropdown, kind, "KDB_IconsDropdown")) {
      const inner = document.createElement("div");
      inner.className = "KDB_IconsDropdown";
      inner.setAttribute(_selectors.dropdownKindAttr, kind);
      inner.setAttribute("data-kdb-showvalues-row", kind);
      inner.setAttribute("tabindex", "-1");
      dropdown.appendChild(inner);
    }
  }

  function appendHostOption(dropdown, node) {
    let nest = dropdown.firstChild;
    while (nest && !isSparedNestNode(nest)) {
      nest = nest.nextSibling;
    }
    if (nest) {
      dropdown.insertBefore(node, nest);
      return;
    }
    dropdown.appendChild(node);
  }

  function readColorOptions(_KDB) {
    const runtimeColor = _KDB.config && _KDB.config.options && _KDB.config.options.color;
    const colorMap = runtimeColor || (_colorPalette && _colorPalette.color) || {};
    return Object.keys(colorMap).map(function (key) {
      return { key: key, label: key, value: colorMap[key] };
    });
  }

  function readStaticOptions(_KDB, configKey) {
    if (configKey === "backgroundColor") {
      return applyConfiguredDefault(readColorOptions(_KDB), "backgroundColor");
    }
    const baseOptions = Array.isArray(_config.options[configKey]) ? _config.options[configKey] : [];
    return configKey === "visualization" || configKey === "topN" ? applyConfiguredDefault(baseOptions, configKey) : baseOptions;
  }

  function populateStaticDropdown(_KDB, root, configKey, selector, isColor, dropdownKind) {
    const dropdown = root.querySelector(selector);
    if (!dropdown) {
      return;
    }
    const options = readStaticOptions(_KDB, configKey);
    clearDropdownChildren(dropdown);
    if (configKey === "showValues") {
      SHOW_VALUES_NESTS.forEach(function (nest) {
        ensureToggleNest(dropdown, nest.kind, nest.phrase);
      });
    }
    options.forEach(function (option, index) {
      appendHostOption(dropdown, buildDropdownOption(_KDB, option, dropdownKind || configKey, isColor, isOptionInitiallySelected(options, index)));
    });
    ensureDropdownSelected(dropdown);
  }

  function buildConfiguredDefaultOption(configKey) {
    const defaultConfig = _dropdownDefaults[configKey] || {};
    return {
      key: defaultConfig.key,
      displayValue: defaultConfig.displayValue,
      useValue: defaultConfig.useValue,
      label: defaultConfig.displayValue,
      value: defaultConfig.useValue,
      isDefault: true
    };
  }

  function readTablePropertyKeys(_KDB, tableName, propertyKey) {
    const properties = _KDB.properties && _KDB.properties.visualizationsDataPropObj;
    const tableData = tableName && properties ? properties[String(tableName)] : null;
    if (tableData && tableData[propertyKey]) {
      const keys = Object.keys(tableData[propertyKey]);
      if (keys.length > 0) {
        return keys;
      }
    }
    if (propertyKey === "dimensions") {
      const dimensions = (_KDB.config && _KDB.config.dimensions) || (_dimensionsConfig && _dimensionsConfig.dimensions) || {};
      return Object.keys(dimensions);
    }
    return [];
  }

  function readTableDropdownOptions(_KDB, tableName, propertyKey, kind) {
    const options = readTablePropertyKeys(_KDB, tableName, propertyKey).map(function (value) {
      return { key: value, label: value, value: value };
    });
    return kind === "dimension" || propertyKey === "dimensions" ? [buildConfiguredDefaultOption("dimension")].concat(options) : options;
  }

  function populateTableDropdown(_KDB, context, kind, selector, propertyKey) {
    const dropdown = context.root.querySelector(selector);
    if (!dropdown) {
      return;
    }
    const options = readTableDropdownOptions(_KDB, context.kennzahlenTable || context.metricsTable || "", propertyKey, kind);
    clearDropdownChildren(dropdown);
    options.forEach(function (option, index) {
      dropdown.appendChild(buildDropdownOption(_KDB, option, kind, false, isOptionInitiallySelected(options, index)));
    });
    ensureDropdownSelected(dropdown);
  }

  return {
    populateStaticDropdown: populateStaticDropdown,
    populateTableDropdown: populateTableDropdown
  };
});
