define([
  "../../../../../dashboard/widgets/widgetSettings/config/dropdownDefaults.js",
], function (_dropdownDefaults) {
  "use strict";

  const COLOUR_DEFAULT = _dropdownDefaults.backgroundColor.useValue;

  function assignOptionalString(_target, _key, _value) {
    if (_value == null) {
      return;
    }
    const text = String(_value).trim();
    if (text === "" || text.toLowerCase() === "none" || text.toLowerCase() === "default") {
      return;
    }
    _target[_key] = text;
  }

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

  function mapVisWidget(_widget, _common) {
    const code = _widget && _widget.data && typeof _widget.data.code === "string"
      ? _widget.data.code.trim() : "";
    if (code === "" || typeof _widget.visualType !== "string" || _widget.visualType.trim() === "") {
      return null;
    }
    const selected = _widget.selectedOptions && typeof _widget.selectedOptions === "object"
      ? _widget.selectedOptions : {};
    const mapped = Object.assign({}, _common, {
      kind: "vis",
      code: code,
      type: _widget.visualType.trim(),
    });
    assignOptionalString(mapped, "dim", selected.dimension);
    assignOptionalString(mapped, "topn", selected.topN);
    assignOptionalColour(mapped, "bgcol", selected.backgroundColor);
    return mapped;
  }

  return Object.freeze({ mapVisWidget: mapVisWidget });
});
