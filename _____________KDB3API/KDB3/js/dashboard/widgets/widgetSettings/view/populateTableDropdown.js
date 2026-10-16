define([
  "../config/dimensions.js",
  "../config/dropdownDefaults.js",
  "../config/applyConfiguredDefault.js",
  "./buildDropdownOption.js",
  "./dropdownPopulateHelpers.js"
], function (_dimensionsConfig, _dropdownDefaults, _applyConfiguredDefault, _buildDropdownOption, _dropdownPopulateHelpers) {
  function __controller(_KDB, _context, _kind, _selector, _propertyKey) {
    try {
      const dropdown = _context.root.querySelector(_selector);
      const tableName = _context.kennzahlenTable || _context.metricsTable || "";
      const options = readTableDropdownOptions(_KDB, tableName, _propertyKey, _kind);
      let index = 0;
      if (!dropdown) {
        return;
      }
      _dropdownPopulateHelpers.clearDropdownChildren(dropdown);
      while (index < options.length) {
        dropdown.appendChild(_buildDropdownOption(
          _KDB,
          options[index],
          _kind,
          false,
          _applyConfiguredDefault.isOptionInitiallySelected(options, index)
        ));
        index += 1;
      }
      _dropdownPopulateHelpers.ensureDropdownSelected(dropdown);
    } catch (err) {
      console.error("[widgetSettings.populateTableDropdown] failed", { kind: _kind }, err);
      throw err;
    }
  }

  function readTableDropdownOptions(_KDB, tableName, propertyKey, kind) {
    const values = readTablePropertyKeys(_KDB, tableName, propertyKey);
    if (kind === "dimension" || propertyKey === "dimensions") {
      return [buildConfiguredDefaultOption("dimension")].concat(buildDimensionOptions(values));
    }
    return buildDimensionOptions(values);
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

  function buildDimensionOptions(values) {
    const options = [];
    let index = 0;
    while (index < values.length) {
      options.push({
        key: values[index],
        label: values[index],
        value: values[index]
      });
      index += 1;
    }
    return options;
  }

  function readTablePropertyKeys(_KDB, tableName, propertyKey) {
    const tableData = readVisualizationTableData(_KDB, tableName);
    if (tableData && tableData[propertyKey]) {
      const keys = Object.keys(tableData[propertyKey]);
      if (keys.length > 0) {
        return keys;
      }
    }
    if (propertyKey === "dimensions") {
      return Object.keys(readDimensionsMap(_KDB));
    }
    return [];
  }

  function readDimensionsMap(_KDB) {
    const runtimeDimensions = _KDB.config && _KDB.config.dimensions;
    const configDimensions = _dimensionsConfig && _dimensionsConfig.dimensions;
    return runtimeDimensions || configDimensions || {};
  }

  function readVisualizationTableData(_KDB, tableName) {
    const properties = _KDB.properties && _KDB.properties.visualizationsDataPropObj;
    return tableName && properties ? properties[String(tableName)] : null;
  }

  return __controller;
});
