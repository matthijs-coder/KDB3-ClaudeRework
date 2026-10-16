define([], function () {
  "use strict";

  function readFilterLabel(_filterEl, _selectors) {
    var labelSelector = _selectors && _selectors.filterLabelSelector;
    var labelEl = labelSelector && _filterEl ? _filterEl.querySelector(labelSelector) : null;
    var attr = _selectors && _selectors.filterDataIdAttr;
    return labelEl && attr ? String(labelEl.getAttribute(attr) || "").trim() : "";
  }

  return {
    readFilterLabel: readFilterLabel
  };
});
