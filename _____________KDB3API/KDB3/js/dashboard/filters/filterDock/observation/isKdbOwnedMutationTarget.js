define([], function () {
  "use strict";

  var KDB_OWNED_CLASS_PATTERN =
    /\bKDB_selectedOption\b|\bKDB_singleSelect|\bKDB_dienststelle\b|\bKDB_dienststelle_active\b|\bKDB_dienststelleActive_BW\b|\bKDB_dienststelleActive_DEZPV\b|\bKDB_dienststelle_popupLabelsReady\b/;

  function __controller(_node) {
    var current = _node;
    var className;
    while (current && current.nodeType === 1) {
      className = typeof current.className === "string" ? current.className : "";
      if (KDB_OWNED_CLASS_PATTERN.test(className)) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  return __controller;
});
