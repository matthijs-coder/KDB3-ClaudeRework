define([], function () {
  "use strict";

  function isPlainObject(_value) {
    return !!_value && typeof _value === "object" && !Array.isArray(_value);
  }

  function copyFilterValue(_value) {
    var copy;
    var keys;
    var index;
    var key;
    if (Array.isArray(_value)) {
      return _value.slice();
    }
    if (!isPlainObject(_value)) {
      return _value;
    }
    copy = {};
    keys = Object.keys(_value);
    for (index = 0; index < keys.length; index += 1) {
      key = keys[index];
      copy[key] = Array.isArray(_value[key]) ? _value[key].slice() : _value[key];
    }
    return copy;
  }

  function expandToken(_token, _parameterMap) {
    if (_token === "") {
      return "";
    }
    if (typeof _token !== "string" || _token.charAt(0) === "[" || !_parameterMap) {
      return _token;
    }
    if (_token === "Jahr" && _parameterMap.Jahr_slots_KID != null) {
      return _parameterMap.Jahr_slots_KID;
    }
    if (_token === "Monat" && _parameterMap.Monat_slots_KID != null) {
      return _parameterMap.Monat_slots_KID;
    }
    return _token;
  }

  function expandSlotValue(_value, _parameterMap) {
    var expanded;
    var index;
    if (_value === "") {
      return "";
    }
    if (!Array.isArray(_value)) {
      return expandToken(_value, _parameterMap);
    }
    expanded = [];
    for (index = 0; index < _value.length; index += 1) {
      expanded[index] = expandToken(_value[index], _parameterMap);
    }
    return expanded;
  }

  function mergeWidgetFilter(_target, _source) {
    var result = _target || {};
    var keys;
    var index;
    var key;
    var incoming;
    if (!isPlainObject(_source)) {
      return result;
    }
    keys = Object.keys(_source);
    for (index = 0; index < keys.length; index += 1) {
      key = keys[index];
      incoming = _source[key];
      if (key === "AggregationstypId" || incoming === null) {
        if (incoming === null) {
          delete result[key];
        } else {
          result[key] = copyFilterValue(incoming);
        }
      } else if (isPlainObject(result[key]) && isPlainObject(incoming)) {
        result[key] = Object.assign({}, result[key], copyFilterValue(incoming));
      } else {
        result[key] = copyFilterValue(incoming);
      }
    }
    return result;
  }

  function expandWidgetFilterKeys(_widgetFilter, _parameterMap) {
    var result;
    var keys;
    var index;
    var key;
    var kid;
    if (!isPlainObject(_widgetFilter)) {
      return _widgetFilter;
    }
    result = {};
    keys = Object.keys(_widgetFilter);
    for (index = 0; index < keys.length; index += 1) {
      key = keys[index];
      kid = (key === "Monat" || key === "Jahr")
        ? _parameterMap && _parameterMap[key + "_widget_localfilter_KID"]
        : undefined;
      result[typeof kid === "string" ? kid : key] = copyFilterValue(_widgetFilter[key]);
    }
    return result;
  }

  function applyGrainOverlayOnClone(_clone, _overlay, _parameterMap) {
    var clone = _clone;
    var keys;
    var index;
    var key;
    if (!_overlay) {
      return clone;
    }
    keys = Object.keys(_overlay);
    for (index = 0; index < keys.length; index += 1) {
      key = keys[index];
      if (key === "widgetFilter") {
        continue;
      }
      clone[key] = expandSlotValue(_overlay[key], _parameterMap);
    }
    if (Object.prototype.hasOwnProperty.call(_overlay, "widgetFilter")) {
      clone.widgetFilter = mergeWidgetFilter(
        clone.widgetFilter || {},
        expandWidgetFilterKeys(_overlay.widgetFilter, _parameterMap)
      );
    }
    return clone;
  }

  return applyGrainOverlayOnClone;
});
