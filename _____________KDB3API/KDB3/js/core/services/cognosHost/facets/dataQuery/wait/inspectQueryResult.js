define([], function () {
  "use strict";

  // Structured-query probe used by the wait. Resolve when itemCount > 0 even
  // if rowCount is 0 — an empty structured query is valid. Do not wait for
  // rowCount > 0 (that would be a stealth Jahr/Top-N fix).
  function inspectQueryResult(_result) {
    var items;
    var rowCount;
    if (!_result) {
      return { itemCount: 0, rowCount: 0, isEmpty: true };
    }
    items = typeof _result.getResultItemList === "function"
      ? _result.getResultItemList() || []
      : [];
    if (typeof _result.getRowCount === "function") {
      rowCount = _result.getRowCount();
    } else if (items[0] && typeof items[0].getRowCount === "function") {
      rowCount = items[0].getRowCount();
    } else {
      rowCount = 0;
    }
    return {
      itemCount: items.length,
      rowCount: rowCount,
      isEmpty: rowCount === 0
    };
  }

  return inspectQueryResult;
});
