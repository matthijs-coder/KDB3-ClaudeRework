define([
  "../defaults/normalizeDefaultValue.js",
], function (_normalizeDefaultValue) {
  "use strict";

  function toArray(_value) {
    if (Array.isArray(_value)) {
      var out = [];
      for (var i = 0; i < _value.length; i += 1) {
        if (typeof _value[i] === "string" && _value[i].trim()) {
          out.push(_value[i].trim());
        }
      }
      return out;
    }
    if (typeof _value === "string" && _value.trim() && _value.trim() !== "noTable") {
      return [_value.trim()];
    }
    return [];
  }

  function replaceKennzahlInArray(_value, _code) {
    var out = [];
    for (var i = 0; i < _value.length; i += 1) {
      out.push(replaceKennzahl(_value[i], _code));
    }
    return out;
  }

  function replaceKennzahl(_value, _code) {
    if (!_code) {
      return _value;
    }
    if (typeof _value === "string") {
      return _value.indexOf("replaceKennzahlName") >= 0 ? _value.replace(/replaceKennzahlName/g, _code) : _value;
    }
    if (Array.isArray(_value)) {
      return replaceKennzahlInArray(_value, _code);
    }
    return _value;
  }

  function qualifyValuesId(_id, _code) {
    if (!_id || !_code || _id.indexOf("[KDB Kennzahlen]") < 0 || _id.indexOf(".[" + _code + "]") >= 0) {
      return _id;
    }
    return _id + ".[" + _code + "]";
  }

  function defaultsForSlot(_slotName, _raw, _dataConfig) {
    var ids = toArray(replaceKennzahl(_raw, _dataConfig.kennzahlCode));
    if (_slotName === "values" && !ids.length && _dataConfig.kennzahlCode) {
      ids = [String(_dataConfig.kennzahlCode)];
    }
    if (_slotName === "values") {
      for (var i = 0; i < ids.length; i += 1) {
        ids[i] = qualifyValuesId(ids[i], _dataConfig.kennzahlCode);
      }
    }
    return ids;
  }

  function dimensionEntry(_dataConfig) {
    var key = _normalizeDefaultValue(_dataConfig.dimension);
    if (!key) {
      return null;
    }
    var dims = _dataConfig.dataTableConfig && _dataConfig.dataTableConfig.dimensions;
    return dims && dims[key] ? { key: key, entry: dims[key] } : null;
  }

  return {
    defaultsForSlot: defaultsForSlot,
    dimensionEntry: dimensionEntry,
  };
});
