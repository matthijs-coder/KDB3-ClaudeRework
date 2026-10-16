define([], function () {
  "use strict";

  function escapeCssValue(_value) {
    if (typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function") {
      return CSS.escape(String(_value));
    }
    return String(_value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  function selectIdentityNodes(_identity, _fields) {
    var escaped = escapeCssValue(_identity);
    var selector = _fields.map(function (_field) {
      return "[" + _field + "=\"" + escaped + "\"]";
    }).join(", ");
    return document.querySelectorAll(selector);
  }

  return selectIdentityNodes;
});
