define([], function () {
  "use strict";

  function normalizeCellToDU(cell) {
    var display;
    var use;
    if (cell === null || cell === undefined) {
      return null;
    }
    if (typeof cell !== "object" || Object.prototype.toString.call(cell) === "[object Array]") {
      if (String(cell).trim() === "") {
        return null;
      }
      return { d: cell, u: cell };
    }
    display = firstDefined(cell.d, cell.display, cell.displayValue, cell.label, cell.caption);
    use = firstDefined(cell.u, cell.use, cell.useValue, cell.value, cell.v);
    if (display == null && use == null) {
      return null;
    }
    if (display == null) {
      display = use;
    }
    if (use == null) {
      use = display;
    }
    if (!String(display).trim() && !String(use).trim()) {
      return null;
    }
    return { d: display, u: use };
  }

  function firstDefined() {
    var index = 0;
    while (index < arguments.length) {
      if (arguments[index] !== undefined && arguments[index] !== null) {
        return arguments[index];
      }
      index += 1;
    }
    return null;
  }

  return {
    normalizeCellToDU: normalizeCellToDU
  };
});
