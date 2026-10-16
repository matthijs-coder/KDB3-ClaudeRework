define([], function () {
  "use strict";

  function readFirstRowScalar(_rows) {
    var row;
    var keys;
    var cell;
    if (!Array.isArray(_rows) || !_rows.length) {
      return null;
    }
    row = _rows[0];
    if (!row || typeof row !== "object") {
      return null;
    }
    keys = Object.keys(row);
    if (!keys.length) {
      return null;
    }
    cell = row[keys[0]];
    if (cell && typeof cell === "object") {
      if (cell.use != null) {
        return cell.use;
      }
      if (cell.u != null) {
        return cell.u;
      }
      if (cell.d != null) {
        return cell.d;
      }
    }
    return cell;
  }

  return readFirstRowScalar;
});
