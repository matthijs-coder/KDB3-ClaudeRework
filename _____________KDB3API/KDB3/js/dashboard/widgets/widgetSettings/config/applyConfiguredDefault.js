define([
  "./dropdownDefaults.js",
  "./configuredDefaultOptionUtils.js"
], function (_dropdownDefaults, _optionUtils) {
  function applyConfiguredDefault(options, configKey) {
    try {
      const defaultConfig = _dropdownDefaults[configKey];
      if (!defaultConfig) {
        return Array.isArray(options) ? options.slice() : [];
      }
      const source = Array.isArray(options) ? options : [];
      const matched = _optionUtils.findMatchingOption(source, defaultConfig);
      const defaultOption = _optionUtils.mergeWithDefault(matched || {}, defaultConfig);
      return [defaultOption].concat(_optionUtils.filterNonDefaultOptions(source, defaultConfig, defaultOption));
    } catch (err) {
      console.error("[widgetSettings.applyConfiguredDefault] failed", { configKey: configKey }, err);
      throw err;
    }
  }

  return {
    applyConfiguredDefault: applyConfiguredDefault,
    isOptionInitiallySelected: _optionUtils.isOptionInitiallySelected
  };
});
