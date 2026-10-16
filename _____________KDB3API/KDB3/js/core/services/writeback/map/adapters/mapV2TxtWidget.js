define([
  "../../../../../dashboard/widgets/widgetSettings/config/dropdownDefaults.js",
], function (_dropdownDefaults) {
  "use strict";

  const COLOUR_DEFAULT = _dropdownDefaults.backgroundColor.useValue;
  const RESTYLE_DEFAULT = _dropdownDefaults.layout.useValue;

  function assignOptionalColour(_target, _key, _value) {
    if (_value == null || _value === "") {
      return;
    }
    const text = String(_value).trim();
    if (text === "" || text.toLowerCase() === "none" || text.toLowerCase() === "default") {
      return;
    }
    if (text.toLowerCase() === String(COLOUR_DEFAULT).toLowerCase()) {
      return;
    }
    _target[_key] = _value;
  }

  function assignOptionalString(_target, _key, _value, _defaultValue) {
    if (_value == null || String(_value) === String(_defaultValue)) {
      return;
    }
    const text = String(_value).trim();
    if (text === "" || text.toLowerCase() === "none" || text.toLowerCase() === "default") {
      return;
    }
    _target[_key] = text;
  }

  function parseLeadingInteger(_token) {
    if (_token == null) {
      return null;
    }
    const match = String(_token).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  function mapTxtWidget(_widget, _common) {
    const text = typeof _widget.widgetTitle === "string" ? _widget.widgetTitle : "";
    const selected = _widget.selectedOptions && typeof _widget.selectedOptions === "object"
      ? _widget.selectedOptions : {};
    const mapped = Object.assign({}, _common, { kind: "txt", text: text });
    const fsize = parseLeadingInteger(selected.fontSize);
    if (fsize !== null) {
      mapped.fsize = fsize;
    }
    assignOptionalColour(mapped, "bgcol", selected.backgroundColor);
    assignOptionalString(mapped, "style", selected.restyle, RESTYLE_DEFAULT);
    return mapped;
  }

  return Object.freeze({ mapTxtWidget: mapTxtWidget });
});
