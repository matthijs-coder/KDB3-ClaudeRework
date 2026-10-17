define([
  "../../../../core/utils/convertUnitToPx.js",
  "../../../../core/config/writebackErrorCodes.js",
], function (_convertUnitToPx, _errorCodes) {
  "use strict";

  function parseDimension(_value) {
    if (typeof _value === "number" && isFinite(_value)) {
      return Math.round(_value);
    }
    return _convertUnitToPx(_value);
  }

  function pushTabSkipped(_diagnostics, _widgetId) {
    _diagnostics.push(_errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
      "map",
      "v2 widget omitted because tab.index is missing or unparseable",
      { widgetId: _widgetId }
    ));
  }

  function readWidgetTab(_widget, _diagnostics, _widgetId) {
    const tabNode = _widget && _widget.tab;
    const raw = tabNode && tabNode.index != null ? tabNode.index : null;
    if (raw === null || raw === undefined || raw === "") {
      pushTabSkipped(_diagnostics, _widgetId);
      return null;
    }
    const tabIdx = parseInt(String(raw), 10);
    if (!isFinite(tabIdx) || tabIdx < 0) {
      pushTabSkipped(_diagnostics, _widgetId);
      return null;
    }
    return tabIdx;
  }

  function readWidgetLayout(_widget) {
    const style = _widget && _widget.style ? _widget.style : {};
    const x = parseDimension(style.left);
    const y = parseDimension(style.top);
    const w = parseDimension(style.width);
    const h = parseDimension(style.height);
    if (x === null || y === null || w === null || h === null) {
      return null;
    }
    return { x: x, y: y, w: w, h: h };
  }

  return Object.freeze({
    parseDimension: parseDimension,
    readWidgetTab: readWidgetTab,
    readWidgetLayout: readWidgetLayout,
  });
});
