define([], function () {
  function optionKeyMatches(option, key) {
    if (!key) {
      return false;
    }
    const optionKey = String(option.key || "").toLowerCase();
    return optionKey === String(key).toLowerCase();
  }

  function readOptionUseValue(option) {
    if (option.useValue != null) {
      return option.useValue;
    }
    if (option.value != null) {
      return option.value;
    }
    return option.key;
  }

  function normalizeUseValue(value) {
    return String(value == null ? "" : value).toLowerCase();
  }

  function optionUseValueMatches(option, useValue) {
    if (useValue == null) {
      return false;
    }
    return normalizeUseValue(readOptionUseValue(option)) === normalizeUseValue(useValue);
  }

  function findMatchingOption(source, defaultConfig) {
    let index = 0;
    while (index < source.length) {
      if (optionKeyMatches(source[index], defaultConfig.key)) {
        return source[index];
      }
      index += 1;
    }
    index = 0;
    while (index < source.length) {
      if (optionUseValueMatches(source[index], defaultConfig.useValue)) {
        return source[index];
      }
      index += 1;
    }
    return null;
  }

  function clearDefaultFlag(option) {
    const copy = Object.assign({}, option);
    delete copy.isDefault;
    return copy;
  }

  function isDefaultDuplicate(option, defaultConfig, defaultOption) {
    if (optionKeyMatches(option, defaultConfig.key)) {
      return true;
    }
    if (optionKeyMatches(option, defaultOption.key)) {
      return true;
    }
    return optionUseValueMatches(option, defaultConfig.useValue)
      || optionUseValueMatches(option, defaultOption.useValue);
  }

  function filterNonDefaultOptions(source, defaultConfig, defaultOption) {
    const filtered = [];
    let index = 0;
    while (index < source.length) {
      if (!isDefaultDuplicate(source[index], defaultConfig, defaultOption)) {
        filtered.push(clearDefaultFlag(source[index]));
      }
      index += 1;
    }
    return filtered;
  }

  function mergeWithDefault(option, defaultConfig) {
    const useValue = defaultConfig.useValue != null
      ? defaultConfig.useValue
      : readOptionUseValue(option);
    const displayValue = defaultConfig.displayValue
      || option.displayValue
      || option.label
      || option.key
      || useValue;
    return {
      key: defaultConfig.key || option.key,
      displayValue: displayValue,
      useValue: useValue,
      label: displayValue,
      value: useValue,
      icon: option.icon,
      isDefault: true
    };
  }

  function hasConfiguredDefault(options) {
    let index = 0;
    while (index < options.length) {
      if (options[index].isDefault === true) {
        return true;
      }
      index += 1;
    }
    return false;
  }

  function isOptionInitiallySelected(options, index) {
    if (!Array.isArray(options) || options.length === 0) {
      return false;
    }
    if (hasConfiguredDefault(options)) {
      return options[index].isDefault === true;
    }
    return index === 0;
  }

  return {
    findMatchingOption: findMatchingOption,
    filterNonDefaultOptions: filterNonDefaultOptions,
    mergeWithDefault: mergeWithDefault,
    isOptionInitiallySelected: isOptionInitiallySelected
  };
});
