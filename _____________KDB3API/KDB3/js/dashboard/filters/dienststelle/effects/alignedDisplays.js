define([], function () {
  "use strict";

  function hostCaption(_entry) {
    if (
      _entry &&
      typeof _entry === "object" &&
      typeof _entry.hostDisplay === "string" &&
      _entry.hostDisplay !== ""
    ) {
      return String(_entry.hostDisplay);
    }
    return "";
  }

  function extractUseValues(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (entry == null) {
        continue;
      }
      if (typeof entry === "string" && entry !== "") {
        out.push(entry);
        continue;
      }
      if (entry.useValue != null && String(entry.useValue) !== "") {
        out.push(String(entry.useValue));
      }
    }
    return out;
  }

  function extractDisplayValues(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (entry == null) {
        continue;
      }
      if (typeof entry === "string" && entry !== "") {
        out.push(entry);
        continue;
      }
      if (entry.displayValue != null && String(entry.displayValue) !== "") {
        out.push(String(entry.displayValue));
      } else if (entry.useValue != null && String(entry.useValue) !== "") {
        out.push(String(entry.useValue));
      }
    }
    return out;
  }

  function collectFromEntries(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (entry == null) {
        continue;
      }
      if (typeof entry === "string" && entry !== "") {
        out.push("");
        continue;
      }
      if (entry.displayValue != null && String(entry.displayValue) !== "") {
        out.push(hostCaption(entry));
      } else if (entry.useValue != null && String(entry.useValue) !== "") {
        out.push(hostCaption(entry));
      }
    }
    return out;
  }

  function keepHostDisplays(_useValues, _hostValues) {
    var useIn = Array.isArray(_useValues) ? _useValues : [];
    var hostIn = Array.isArray(_hostValues) ? _hostValues : [];
    var out = [];
    var seen = {};
    var idx;
    var entry;
    var token;
    var hostDisplay;
    for (idx = 0; idx < useIn.length; idx += 1) {
      entry = useIn[idx];
      if (entry == null) {
        continue;
      }
      token = String(entry).trim();
      if (token === "" || seen[token]) {
        continue;
      }
      seen[token] = true;
      hostDisplay = hostIn[idx];
      if (typeof hostDisplay === "string" && hostDisplay !== "") {
        out.push(String(hostDisplay));
      } else {
        out.push("");
      }
    }
    return out;
  }

  // Page-context displayValues are kept by first-seen useValue. Host captions
  // use that same keep so hostDisplayValues stays index-aligned.
  function collectFromScopeMap(_pageContextValuesByScope) {
    var useOut = [];
    var hostOut = [];
    var scopes = _pageContextValuesByScope && typeof _pageContextValuesByScope === "object"
      ? _pageContextValuesByScope
      : {};
    var scopeIds = Object.keys(scopes);
    var idx;
    var scopeValues;
    for (idx = 0; idx < scopeIds.length; idx += 1) {
      scopeValues = scopes[scopeIds[idx]];
      useOut = useOut.concat(extractUseValues(scopeValues));
      hostOut = hostOut.concat(collectFromEntries(scopeValues));
    }
    return keepHostDisplays(useOut, hostOut);
  }

  function collectAlignedHostDisplays(_values) {
    if (Array.isArray(_values)) {
      return collectFromEntries(_values);
    }
    return collectFromScopeMap(_values);
  }

  function uniqueAlignedUseDisplayValues(_useValues, _displayValues) {
    var useIn = Array.isArray(_useValues) ? _useValues : [];
    var displayIn = Array.isArray(_displayValues) ? _displayValues : [];
    var useValues = [];
    var displayValues = [];
    var seen = {};
    var idx;
    var entry;
    var token;
    var display;
    var trimmedDisplay;
    for (idx = 0; idx < useIn.length; idx += 1) {
      entry = useIn[idx];
      if (entry == null) {
        continue;
      }
      token = String(entry).trim();
      if (token === "" || seen[token]) {
        continue;
      }
      seen[token] = true;
      useValues.push(token);
      display = displayIn[idx];
      trimmedDisplay = display == null ? "" : String(display).trim();
      displayValues.push(trimmedDisplay !== "" ? trimmedDisplay : token);
    }
    return { useValues: useValues, displayValues: displayValues };
  }

  return {
    extractUseValues: extractUseValues,
    extractDisplayValues: extractDisplayValues,
    collectAlignedHostDisplays: collectAlignedHostDisplays,
    uniqueAlignedUseDisplayValues: uniqueAlignedUseDisplayValues
  };
});
