define([
  "../config/selectors.js"
], function (_selectors) {
  function isHostOwnedOption(_host, _option) {
    try {
      return !!(_host && _option && typeof _option.closest === "function"
        && _option.closest(_selectors.dropdownSelector) === _host);
    } catch (err) {
      console.error("[widgetSettings.isHostOwnedOption] failed", err);
      throw err;
    }
  }

  return isHostOwnedOption;
});
