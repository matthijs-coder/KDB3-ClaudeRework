define([
  "../../schema/errorCodes.js",
  "./parseV2WidgetLayout.js",
  "./mapV2VisWidget.js",
  "./mapV2TxtWidget.js",
], function (_errorCodes, _parseV2WidgetLayout, _mapV2VisWidget, _mapV2TxtWidget) {
  "use strict";

  function normalizeWidgetType(_widgetType) {
    return String(_widgetType || "").trim().toLowerCase().replace(/^widget\./, "");
  }

  function isUnsupportedTableKind(_widgetType) {
    const kind = normalizeWidgetType(_widgetType);
    return kind === "datatable" || kind === "topn" || kind === "table";
  }

  function isHeaderDraggable(_widget) {
    const code = _widget && _widget.data ? _widget.data.code : "";
    if (code === "KDB_CB_HeaderDraggable") {
      return true;
    }
    return _widget && _widget.headerWidget === true;
  }

  function isWritebackTable(_widget) {
    return _widget && _widget.widgetTitle === "WritebackTabel";
  }

  function mapV2WidgetEntry(_widget, _widgetId, _diagnostics) {
    try {
      if (isHeaderDraggable(_widget) || isWritebackTable(_widget)) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
          "map",
          "v2 widget skipped by design",
          { widgetId: _widgetId }
        ));
        return null;
      }
      if (isUnsupportedTableKind(_widget.widgetType)) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_WIDGET_KIND_UNSUPPORTED,
          "map",
          "v2 widget kind is not supported in tranche 1",
          { widgetId: _widgetId, widgetType: _widget.widgetType }
        ));
        return null;
      }
      const tabIdx = _parseV2WidgetLayout.readWidgetTab(_widget, _diagnostics, _widgetId);
      if (tabIdx === null) {
        return null;
      }
      const layout = _parseV2WidgetLayout.readWidgetLayout(_widget);
      if (!layout) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
          "map",
          "v2 widget omitted because layout could not be parsed",
          { widgetId: _widgetId }
        ));
        return null;
      }
      const common = Object.assign({ tab: tabIdx }, layout);
      if (_widget.localFilters !== undefined && _widget.localFilters !== null) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED,
          "map",
          "v2 widget localFilters are not persisted in v3",
          { widgetId: _widgetId }
        ));
      }
      const kind = normalizeWidgetType(_widget.widgetType);
      if (kind === "live" || kind === "vis") {
        const vis = _mapV2VisWidget.mapVisWidget(_widget, common);
        if (!vis) {
          _diagnostics.push(_errorCodes.makeDiagnostic(
            _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
            "map",
            "v2 vis widget omitted because data.code or visualType is missing",
            { widgetId: _widgetId }
          ));
        }
        return vis;
      }
      if (kind === "text" || kind === "txt") {
        return _mapV2TxtWidget.mapTxtWidget(_widget, common);
      }
      _diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_WIDGET_KIND_UNSUPPORTED,
        "map",
        "v2 widget kind is not supported in tranche 1",
        { widgetId: _widgetId, widgetType: _widget.widgetType }
      ));
      return null;
    } catch (error) {
      throw error;
    }
  }

  return mapV2WidgetEntry;
});
