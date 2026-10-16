define([], function () {
  "use strict";
  function __controller(_rows) {
    try {
      if (!Array.isArray(_rows) || !_rows[0]) return null;
      var row0 = _rows[0];
      var cell;
      if (Object.prototype.hasOwnProperty.call(row0, "aktualisierungsDatum")) {
        cell = row0.aktualisierungsDatum;
      } else {
        cell = row0[Object.keys(row0)[0]];
      }
      if (cell == null) return null;
      if (typeof cell !== "object") {
        var asText = String(cell).trim();
        return asText ? asText : null;
      }
      var fields = ["use", "u", "display", "d"];
      var i;
      var value;
      var text;
      for (i = 0; i < fields.length; i += 1) {
        value = cell[fields[i]];
        if (value == null) continue;
        text = String(value).trim();
        if (text) return text;
      }
      return null;
    } catch (err) {
      console.error("[footer.readUpdateDateFromRows]", err);
      throw err;
    }
  }
  return __controller;
});
