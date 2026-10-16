define([
  "./createFrameworkElement.js",
  "./primitives/formRows.js",
  "../config/labels.js"
], function (_createElement, _formRows, _labels) {
  "use strict";

  var INLINE_ROW_CLASS = "kdb-control_settings-inline-row";

  function createTwoInputRow(extraClass) {
    return _createElement("div", null, INLINE_ROW_CLASS + " kdb-control_twoinput-row" + (extraClass ? " " + extraClass : ""), null);
  }

  function createOneInputRow() {
    return _createElement("div", null, INLINE_ROW_CLASS + " kdb-control_oneinput-row", null);
  }

  function appendTwoInputSplit(row, leftEl, rightEl) {
    var split = _createElement("div", null, "kdb-control_twoinput-row-split", null);
    split.appendChild(leftEl);
    split.appendChild(rightEl);
    row.appendChild(split);
    return row;
  }

  function createSettingsChromeBlock(caption, innerControl) {
    var wrap = _createElement("div", null, "kdb-control_settings-chrome-block", null);
    var captionEl = _createElement("div", null, "kdb-control_input-label", null);
    captionEl.textContent = caption;
    wrap.appendChild(captionEl);
    wrap.appendChild(innerControl);
    return wrap;
  }

  function readMinimumPlaceholder(axis) {
    var minimum = axis && axis.minimum != null ? String(axis.minimum).trim() : "";
    return minimum.length ? _labels.settings.minPrefix + minimum : "";
  }

  // Width and height inputs side by side; `axis` entries come from config/settingsDefaults.js dimensions.
  function buildDimensionInputs(widthAxis, heightAxis, widthId, heightId) {
    var row = createTwoInputRow();
    return appendTwoInputSplit(
      row,
      _formRows.createTextInputRow(_labels.settings.width, readMinimumPlaceholder(widthAxis), widthId, widthAxis.default),
      _formRows.createTextInputRow(_labels.settings.height, readMinimumPlaceholder(heightAxis), heightId, heightAxis.default)
    );
  }

  return {
    createTwoInputRow: createTwoInputRow,
    createOneInputRow: createOneInputRow,
    appendTwoInputSplit: appendTwoInputSplit,
    createSettingsChromeBlock: createSettingsChromeBlock,
    buildDimensionInputs: buildDimensionInputs
  };
});
