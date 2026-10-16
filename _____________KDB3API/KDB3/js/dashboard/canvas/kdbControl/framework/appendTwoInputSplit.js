define(["./createFrameworkElement"], function (_createFrameworkElement) {
  "use strict";
  function appendTwoInputSplit(row, leftEl, rightEl) {
    try {
      var split = _createFrameworkElement("div", null, "kdb-control_twoinput-row-split", null);
      split.appendChild(leftEl);
      split.appendChild(rightEl);
      row.appendChild(split);
      return row;
    } catch (err) {
      console.error("[kdbControl.appendTwoInputSplit] failed", err);
      throw err;
    }
  }
  return appendTwoInputSplit;
});
