define([
  "../config/options.js",
  "../config/colorPalette.js",
  "../config/applyConfiguredDefault.js",
  "./buildDropdownOption.js",
  "./dropdownPopulateHelpers.js"
], function (_options, _colorPalette, _applyConfiguredDefault, _buildDropdownOption, _dropdownPopulateHelpers) {
  const applyConfiguredDefault = _applyConfiguredDefault.applyConfiguredDefault;
  const isOptionInitiallySelected = _applyConfiguredDefault.isOptionInitiallySelected;

  function __controller(_KDB, _root, _configKey, _selector, _isColor, _dropdownKind) {
    try {
      const dropdown = _root.querySelector(_selector);
      const options = readOptions(_KDB, _configKey);
      let index = 0;
      if (!dropdown) {
        return;
      }
      _dropdownPopulateHelpers.clearDropdownChildren(dropdown);
      if (_configKey === "showValues") {
        _dropdownPopulateHelpers.ensureToggleNest(dropdown, "iterator", "Iterator");
        _dropdownPopulateHelpers.ensureToggleNest(dropdown, "zoom", "Zoomleiste");
        _dropdownPopulateHelpers.ensureToggleNest(dropdown, "valueCaption", "Werte beschriftung");
      }
      while (index < options.length) {
        _dropdownPopulateHelpers.appendHostOption(dropdown, _buildDropdownOption(
          _KDB,
          options[index],
          _dropdownKind || _configKey,
          _isColor,
          isOptionInitiallySelected(options, index)
        ));
        index += 1;
      }
      _dropdownPopulateHelpers.ensureDropdownSelected(dropdown);
    } catch (err) {
      console.error("[widgetSettings.populateStaticDropdown] failed", { configKey: _configKey }, err);
      throw err;
    }
  }

  function readOptions(_KDB, configKey) {
    if (configKey === "backgroundColor") {
      return applyConfiguredDefault(readColorOptions(_KDB), "backgroundColor");
    }
    if (configKey === "visualization" || configKey === "topN") {
      const baseOptions = _options && Array.isArray(_options[configKey]) ? _options[configKey] : [];
      return applyConfiguredDefault(baseOptions, configKey);
    }
    return _options && Array.isArray(_options[configKey]) ? _options[configKey] : [];
  }

  function readColorOptions(_KDB) {
    try {
      const runtimeColor = _KDB.config && _KDB.config.options && _KDB.config.options.color;
      const colorMap = runtimeColor || (_colorPalette && _colorPalette.color) || {};
      const keys = Object.keys(colorMap);
      const options = [];
      let index = 0;
      while (index < keys.length) {
        options.push({
          key: keys[index],
          label: keys[index],
          value: colorMap[keys[index]]
        });
        index += 1;
      }
      return options;
    } catch (err) {
      console.error("[widgetSettings.readColorOptions] failed", err);
      throw err;
    }
  }

  return __controller;
});
