define(["./parameterSetSelectConstants.js"], function (_constants) {
  "use strict";

  function sanitizeLabel(_label) {
    var match;
    if (!_label) return _label || null;
    match = /^(.*)\s*::\s*.*$/.exec(_label);
    return match ? match[1] : _label;
  }

  function isPlaceholderValue(_value) {
    return _constants.PLACEHOLDER_VALUES.indexOf(_value) !== -1 || _value === _constants.NEW_DASHBOARD_VALUE;
  }

  function readSelectedParameterSet() {
    var select;
    var option;
    try {
      select = typeof document !== "undefined" ? document.getElementById(_constants.SELECT_ID) : null;
      if (!select) return { id: null, label: null };
      if (isPlaceholderValue(select.value)) return { id: null, label: null };
      option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
      return {
        id: select.value,
        label: sanitizeLabel(option ? option.text : null)
      };
    } catch (error) {
      console.error("[writebackBridge.readSelectedParameterSet] failed", error);
      return { id: null, label: null };
    }
  }

  return readSelectedParameterSet;
});
