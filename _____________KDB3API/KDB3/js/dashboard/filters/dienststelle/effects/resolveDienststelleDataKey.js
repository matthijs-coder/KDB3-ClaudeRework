define(["../config/dienststelleDefinitions.js"], function (_definitions) {
  "use strict";

  function __controller(_activeSichtValue) {
    var key = _activeSichtValue != null ? String(_activeSichtValue) : "";
    var entry = key && _definitions[key] ? _definitions[key] : null;
    return entry ? Object.assign({}, entry) : null;
  }

  return __controller;
});
