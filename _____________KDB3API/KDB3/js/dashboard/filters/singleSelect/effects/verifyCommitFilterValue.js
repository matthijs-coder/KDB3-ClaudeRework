define([
  "./readHostFilterValues.js"
], function (_readHostFilterValues) {
  "use strict";

  function normalizeExpected(_expectedSelection) {
    if (_expectedSelection && typeof _expectedSelection === "object") {
      return {
        displayValue: _expectedSelection.displayValue == null ? "" : String(_expectedSelection.displayValue),
        useValue: _expectedSelection.useValue == null ? "" : String(_expectedSelection.useValue)
      };
    }
    return {
      displayValue: _expectedSelection == null ? "" : String(_expectedSelection),
      useValue: ""
    };
  }

  function readPair(_values) {
    if (!_values || !_values[0]) { return { d: "", u: "" }; }
    return {
      d: _values[0].d == null ? "" : String(_values[0].d),
      u: _values[0].u == null ? "" : String(_values[0].u)
    };
  }

  function __controller(_arg1, _arg2, _arg3) {
    try {
      var filtersFacet = _arg3 ? _arg1 : null;
      var filterRef = _arg3 ? _arg2 : _arg1;
      var expected = normalizeExpected(_arg3 ? _arg3 : _arg2);
      var values = _readHostFilterValues(filtersFacet, filterRef);
      var expectedDisplay = expected.displayValue;
      var expectedUse = expected.useValue;
      if (expectedDisplay === "Alle" && expectedUse === "") {
        return { ok: values.length === 0, observed: { d: "", u: "" }, values: values };
      }
      if (expectedDisplay === "Alle" && !_arg3) {
        return { ok: values.length === 0, observed: { d: "", u: "" }, values: values };
      }
      if (values.length !== 1) { return { ok: false, observed: readPair(values), values: values }; }
      var observed = readPair(values);
      if (!_arg3) {
        return { ok: observed.d === expectedDisplay, observed: observed, values: values };
      }
      return { ok: observed.d === expectedDisplay && observed.u === expectedUse, observed: observed, values: values };
    } catch (error) {
      console.error("[singleSelect.verifyCommitFilterValue] failed", error);
      throw error;
    }
  }

  return __controller;
});
