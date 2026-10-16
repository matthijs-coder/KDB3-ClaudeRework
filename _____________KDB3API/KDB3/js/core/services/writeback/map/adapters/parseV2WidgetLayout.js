define([
  "../../../../utils/convertUnitToPx.js",
  "../../schema/errorCodes.js",
], function (_convertUnitToPx, _errorCodes) {
  "use strict";

  function parseLayoutNumber(_value) {
    if (typeof _value === "number" && isFinite(_value)) {
      return Math.round(_value);
    }
    return _convertUnitToPx(_value);
  }

  function readWidgetTab(_widget, _diagnostics, _widgetId) {
    try {
      const tabNode = _widget && _widget.tab;
      const raw = tabNode && tabNode.index != null ? tabNode.index : null;
      if (raw === null || raw === undefined || raw === "") {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
          "map",
          "v2 widget omitted because tab.index is missing or unparseable",
          { widgetId: _widgetId }
        ));
        return null;
      }
      const tabIdx = parseInt(String(raw), 10);
      if (!isFinite(tabIdx) || tabIdx < 0) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
          "map",
          "v2 widget omitted because tab.index is missing or unparseable",
          { widgetId: _widgetId }
        ));
        return null;
      }
      return tabIdx;
    } catch (error) {
      console.error("[writebackMap.readWidgetTab]", error);
      throw error;
    }
  }

  function readWidgetLayout(_widget) {
    try {
      const style = _widget && _widget.style ? _widget.style : {};
      const x = parseLayoutNumber(style.left);
      const y = parseLayoutNumber(style.top);
      const w = parseLayoutNumber(style.width);
      const h = parseLayoutNumber(style.height);
      if (x === null || y === null || w === null || h === null) {
        return null;
      }
      return { x: x, y: y, w: w, h: h };
    } catch (error) {
      console.error("[writebackMap.readWidgetLayout]", error);
      throw error;
    }
  }

  return Object.freeze({
    readWidgetTab: readWidgetTab,
    readWidgetLayout: readWidgetLayout,
  });
});
