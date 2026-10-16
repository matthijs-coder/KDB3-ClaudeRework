define([], function () {
  "use strict";

  function materializeVals(_values) {
    var result = [];
    var idx;
    for (idx = 0; idx < (_values || []).length; idx += 1) {
      var pair = _values[idx] || {};
      var d = String(pair.d == null ? "" : pair.d).trim();
      var u = String(pair.u == null ? "" : pair.u).trim();
      if (d !== "" && u !== "") {
        result.push({ d: d, u: u });
      }
    }
    return result;
  }

  function findUseValue(_pairs, _display) {
    var idx;
    for (idx = 0; idx < _pairs.length; idx += 1) {
      if (_pairs[idx].d === _display) {
        return _pairs[idx].u;
      }
    }
    return "";
  }

  function buildTm1UseValue(_itemId, _display) {
    var id = String(_itemId || "").trim();
    var display = String(_display || "").trim();
    var parts = [];
    var re = /\[([^\]]+)\]/g;
    var match;
    if (!id || !display) {
      return "";
    }
    if (display.indexOf("->[") !== -1) {
      return display;
    }
    while ((match = re.exec(id))) {
      parts.push(match[1]);
    }
    if (parts.length < 3) {
      return "";
    }
    return id + "->:[TMR].[" + parts[1] + "].[" + parts[2] + "].[" + display + "]";
  }

  function mapNativeMultiSelectConfirmedValues(_labels, _knownValues, _itemId) {
    var known = materializeVals(_knownValues);
    var result = [];
    var idx;
    var display;
    var useValue;
    for (idx = 0; idx < (_labels || []).length; idx += 1) {
      display = String(_labels[idx] == null ? "" : _labels[idx]).trim();
      if (!display) {
        continue;
      }
      useValue = findUseValue(known, display) || buildTm1UseValue(_itemId, display);
      if (!useValue) {
        console.warn("[nativeMultiSelect.mapConfirmedValues] missing u for label", display);
        continue;
      }
      result.push({ d: display, u: useValue });
    }
    return result;
  }

  return mapNativeMultiSelectConfirmedValues;
});
