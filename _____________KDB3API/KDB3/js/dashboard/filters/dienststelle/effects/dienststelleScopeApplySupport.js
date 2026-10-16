define([], function () {
  "use strict";

  function cognosDisplay(_entry) {
    var hostDisplay = _entry.hostDisplay != null ? String(_entry.hostDisplay) : "";
    if (hostDisplay !== "") {
      return hostDisplay;
    }
    return _entry.displayValue != null ? String(_entry.displayValue) : "";
  }

  function toCognosValues(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (!entry) {
        continue;
      }
      out.push({
        d: cognosDisplay(entry),
        u: entry.useValue != null ? String(entry.useValue) : ""
      });
    }
    return out;
  }

  function mapClearResult(_clearResult) {
    if (_clearResult && (_clearResult.skipped || _clearResult.ok)) {
      return { ok: true };
    }
    if (!_clearResult) {
      return { ok: false, blocker: "COGNOS_CLEAR_FAILED" };
    }
    return { ok: false, blocker: _clearResult.blocker || "COGNOS_SCOPE_CLEAR_REMAINING" };
  }

  function toAppliedResult(_result) {
    return _result.ok ? { applied: true } : { applied: false, blocker: _result.blocker };
  }

  function expectedForScope(_scopeId, _valuesByScope) {
    var values =
      _scopeId === "global" ? _valuesByScope.global : (_valuesByScope.pageContext || {})[_scopeId];
    if (!values || !Array.isArray(values) || !values.length) {
      return { mode: "empty" };
    }
    return { mode: "values", values: values };
  }

  return {
    toCognosValues: toCognosValues,
    mapClearResult: mapClearResult,
    toAppliedResult: toAppliedResult,
    expectedForScope: expectedForScope
  };
});
