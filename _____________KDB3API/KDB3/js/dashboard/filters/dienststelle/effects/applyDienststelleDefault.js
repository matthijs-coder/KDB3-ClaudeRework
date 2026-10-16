define([
  "./readDefaultDienststelleValue.js",
  "./lookupDienststelleFilterRef.js"
], function (_readDefaultValue, _hostLookup) {
  "use strict";

  function cognosDisplay(_defaultValue) {
    var hostDisplay = _defaultValue && _defaultValue.hostDisplay != null
      ? String(_defaultValue.hostDisplay)
      : "";
    if (hostDisplay !== "") {
      return hostDisplay;
    }
    return _defaultValue.displayValue;
  }

  function toCognosValues(_defaultValue) {
    return [{ d: cognosDisplay(_defaultValue), u: _defaultValue.useValue }];
  }

  function resolveDefaultOutcome(_defaultValue, _outcome) {
    if (_outcome && _outcome.ok === true) {
      return _defaultValue;
    }
    console.warn(
      "[dienststelle.applyDienststelleDefault] host write not applied",
      _outcome ? _outcome.outcome : null,
      _outcome ? (_outcome.errorCode || _outcome.reason) : null
    );
    return null;
  }

  function __controller(_KDB, _context) {
    var context = _context || {};
    var defaultValue = _readDefaultValue(_KDB, context.defaultTableKey);
    var filtersFacet = _hostLookup.readFiltersFacet(_KDB);
    var filterRef = context.filterRef || null;

    if (!defaultValue) {
      console.warn("[dienststelle.applyDienststelleDefault] abort: no defaultValue", context.defaultTableKey);
      return Promise.resolve(null);
    }
    if (!filterRef || !filtersFacet) {
      console.warn(
        "[dienststelle.applyDienststelleDefault] abort: missing filterRef or filters facet"
      );
      return Promise.resolve(null);
    }
    return filtersFacet
      .writeFilter({ ref: filterRef, values: toCognosValues(defaultValue) })
      .then(resolveDefaultOutcome.bind(null, defaultValue));
  }

  return __controller;
});
