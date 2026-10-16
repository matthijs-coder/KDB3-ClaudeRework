define([
  "../config.js",
  "../defaults/normalizeDefaultValue.js",
], function (_config, _normalizeDefaultValue) {
  "use strict";

  function moveElement(_ids, _fromIndex, _toIndex) {
    if (_fromIndex < 0 || _fromIndex >= _ids.length) { return _ids.slice(); }
    var next = _ids.slice();
    var moved = next.splice(_fromIndex, 1)[0];
    if (moved == null) { return next; }
    var target = _toIndex < 0 ? 0 : (_toIndex > next.length ? next.length : _toIndex);
    next.splice(target, 0, moved);
    return next;
  }

  function slotCompositionPolicy(_visTypeConfig, _slotName) {
    var composition = _visTypeConfig && _visTypeConfig.slotComposition;
    return composition && composition[_slotName] ? composition[_slotName] : null;
  }

  function resolveDimensionPolicy(_slotPolicy, _slotName, _dimAffects) {
    if (_slotPolicy && _slotPolicy.dimension) { return _slotPolicy.dimension; }
    var rule = _config.slotRule(_slotName);
    if (rule.defaultDimensionPolicy && _dimAffects === _slotName) {
      return Object.assign({}, rule.defaultDimensionPolicy);
    }
    return null;
  }

  function resolveHierarchyPolicy(_slotPolicy, _slotName) {
    if (_slotPolicy && _slotPolicy.hierarchy) { return _slotPolicy.hierarchy; }
    var rule = _config.slotRule(_slotName);
    return rule.defaultHierarchyPolicy ? Object.assign({}, rule.defaultHierarchyPolicy) : null;
  }

  function applyDimensionComposition(_columnIds, _policy) {
    if (!_policy || _policy.mode !== "prependThenMoveFirstToIndex") { return _columnIds; }
    var targetIndex = typeof _policy.targetIndex === "number" ? _policy.targetIndex : 2;
    return moveElement(_columnIds, 0, targetIndex);
  }

  function insertHierarchyId(_columnIds, _hierarchyId, _policy, _selectedDimensionId) {
    var next = _columnIds.slice();
    var existingIdx = next.indexOf(_hierarchyId);
    if (existingIdx >= 0) { next.splice(existingIdx, 1); }
    if (_policy && _policy.mode === "insertBeforeSelectedDimensionOrBeforeLast") {
      var dimIdx = _selectedDimensionId ? next.indexOf(_selectedDimensionId) : -1;
      var insertAt = dimIdx >= 0 ? dimIdx : Math.max(0, next.length - 1);
      next.splice(insertAt, 0, _hierarchyId);
      return next;
    }
    if (_policy && _policy.mode === "insertAfterSelectedDimensionOrAt") {
      var selectedDimIdx = _selectedDimensionId ? next.indexOf(_selectedDimensionId) : -1;
      var targetIndexAfter = typeof _policy.targetIndex === "number" ? _policy.targetIndex : 0;
      var insertAfterAt = selectedDimIdx >= 0
        ? selectedDimIdx + 1
        : (targetIndexAfter < 0 ? 0 : (targetIndexAfter > next.length ? next.length : targetIndexAfter));
      next.splice(insertAfterAt, 0, _hierarchyId);
      return next;
    }
    if (_policy && _policy.mode === "moveToIndex") {
      var targetIndex = typeof _policy.targetIndex === "number" ? _policy.targetIndex : 0;
      var clamped = targetIndex < 0 ? 0 : (targetIndex > next.length ? next.length : targetIndex);
      next.splice(clamped, 0, _hierarchyId);
      return next;
    }
    if (next.indexOf(_hierarchyId) < 0) { next.push(_hierarchyId); }
    return next;
  }

  function prependUniqueId(_leadId, _columnIds) {
    var merged = [String(_leadId)];
    for (var u = 0; u < _columnIds.length; u += 1) {
      if (_columnIds[u] !== merged[0] && merged.indexOf(_columnIds[u]) < 0) { merged.push(_columnIds[u]); }
    }
    return merged;
  }

  function toTrimmedStrings(_value) {
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
    var ids = toTrimmedStrings(replaceKennzahl(_raw, _dataConfig.kennzahlCode));
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
    slotCompositionPolicy: slotCompositionPolicy,
    resolveDimensionPolicy: resolveDimensionPolicy,
    resolveHierarchyPolicy: resolveHierarchyPolicy,
    applyDimensionComposition: applyDimensionComposition,
    insertHierarchyId: insertHierarchyId,
    prependUniqueId: prependUniqueId,
    defaultsForSlot: defaultsForSlot,
    dimensionEntry: dimensionEntry,
  };
});
