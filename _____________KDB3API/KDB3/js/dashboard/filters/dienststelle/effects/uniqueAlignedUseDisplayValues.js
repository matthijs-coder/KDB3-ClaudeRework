define([], function () {
  "use strict";

  function __controller(_useValues, _displayValues) {
    try {
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
    } catch (error) {
      console.error("[dienststelle.uniqueAlignedUseDisplayValues] failed", error);
      throw error;
    }
  }

  return __controller;
});
