define(["../serialize/cloneSerializable.js"], function (_cloneSerializable) {
  "use strict";

  function normalizeFilterValue(_value) {
    if (typeof _value === "string" && _value.trim()) { return _value.trim(); }
    if (!_value || typeof _value !== "object" || Array.isArray(_value)) { return null; }
    var display = _value.d != null ? _value.d : _value.display != null ? _value.display : _value.displayValue;
    var use = _value.u != null ? _value.u : _value.use != null ? _value.use : _value.useValue;
    if (display == null && use == null) { return null; }
    return { d: String(display != null ? display : use), u: String(use != null ? use : display) };
  }

  function valuesOf(_value) {
    if (!Array.isArray(_value)) { return []; }
    var out = [];
    var normalized;
    for (var i = 0; i < _value.length; i += 1) {
      normalized = normalizeFilterValue(_value[i]);
      if (normalized != null) { out.push(normalized); }
    }
    return out;
  }

  function upsert(_map, _descriptor) {
    if (_descriptor && _descriptor.itemId) { _map[_descriptor.itemId] = _cloneSerializable(_descriptor); }
  }

  function resolveFilterRule(_rule, _fallbackItemId) {
    if (_rule == null) { return null; }
    if (typeof _rule === "object" && !Array.isArray(_rule)) {
      var nestedId = _rule.itemId ? String(_rule.itemId).trim() : "";
      var nestedVals = valuesOf(_rule.values);
      return nestedId && nestedVals.length ? { itemId: nestedId, values: nestedVals } : null;
    }
    var flatVals = valuesOf(_rule);
    return _fallbackItemId && flatVals.length ? { itemId: _fallbackItemId, values: flatVals } : null;
  }

  return { valuesOf: valuesOf, upsert: upsert, resolveFilterRule: resolveFilterRule };
});
