define([
  "../../../../core/config/dropdownDefaults.js",
  "../../../../core/config/writebackErrorCodes.js",
  "./mapV2Layout.js",
], function (_dropdownDefaults, _errorCodes, _mapV2Layout) {
  "use strict";

  const COLOUR_DEFAULT = _dropdownDefaults.backgroundColor.useValue;
  const RESTYLE_DEFAULT = _dropdownDefaults.layout.useValue;

  function isBlankToken(_text) {
    const lower = _text.toLowerCase();
    return _text === "" || lower === "none" || lower === "default";
  }

  function assignOptionalColour(_target, _key, _value) {
    if (_value == null || _value === "") {
      return;
    }
    const text = String(_value).trim();
    if (isBlankToken(text) || text.toLowerCase() === String(COLOUR_DEFAULT).toLowerCase()) {
      return;
    }
    _target[_key] = _value;
  }

  // _defaultValue is only compared when the caller passes one.
  function assignOptionalString(_target, _key, _value, _defaultValue) {
    if (_value == null || (_defaultValue !== undefined && String(_value) === String(_defaultValue))) {
      return;
    }
    const text = String(_value).trim();
    if (isBlankToken(text)) {
      return;
    }
    _target[_key] = text;
  }

  function parseLeadingInteger(_token) {
    if (_token == null) {
      return null;
    }
    const match = String(_token).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  function readSelectedOptions(_widget) {
    return _widget.selectedOptions && typeof _widget.selectedOptions === "object" ? _widget.selectedOptions : {};
  }

  function mapVisWidget(_widget, _common) {
    const code = _widget && _widget.data && typeof _widget.data.code === "string"
      ? _widget.data.code.trim() : "";
    if (code === "" || typeof _widget.visualType !== "string" || _widget.visualType.trim() === "") {
      return null;
    }
    const selected = readSelectedOptions(_widget);
    const mapped = Object.assign({}, _common, {
      kind: "vis",
      code: code,
      type: _widget.visualType.trim(),
    });
    assignOptionalString(mapped, "dim", selected.dimension);
    assignOptionalString(mapped, "topn", selected.topN);
    assignOptionalColour(mapped, "bgcol", selected.backgroundColor);
    return mapped;
  }

  function mapTxtWidget(_widget, _common) {
    const text = typeof _widget.widgetTitle === "string" ? _widget.widgetTitle : "";
    const selected = readSelectedOptions(_widget);
    const mapped = Object.assign({}, _common, { kind: "txt", text: text });
    const fsize = parseLeadingInteger(selected.fontSize);
    if (fsize !== null) {
      mapped.fsize = fsize;
    }
    assignOptionalColour(mapped, "bgcol", selected.backgroundColor);
    assignOptionalString(mapped, "style", selected.restyle, RESTYLE_DEFAULT);
    return mapped;
  }

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

  function pushDiagnostic(_diagnostics, _code, _message, _details) {
    _diagnostics.push(_errorCodes.makeDiagnostic(_errorCodes.codes[_code], "map", _message, _details));
  }

  function mapV2WidgetEntry(_widget, _widgetId, _diagnostics) {
    if (isHeaderDraggable(_widget) || isWritebackTable(_widget)) {
      pushDiagnostic(_diagnostics, "WRITEBACK_SKIPPED_BY_DESIGN", "v2 widget skipped by design", { widgetId: _widgetId });
      return null;
    }
    if (isUnsupportedTableKind(_widget.widgetType)) {
      pushDiagnostic(_diagnostics, "WRITEBACK_WIDGET_KIND_UNSUPPORTED", "v2 widget kind is not supported in tranche 1",
        { widgetId: _widgetId, widgetType: _widget.widgetType });
      return null;
    }
    const tabIdx = _mapV2Layout.readWidgetTab(_widget, _diagnostics, _widgetId);
    if (tabIdx === null) {
      return null;
    }
    const layout = _mapV2Layout.readWidgetLayout(_widget);
    if (!layout) {
      pushDiagnostic(_diagnostics, "WRITEBACK_SKIPPED_BY_DESIGN", "v2 widget omitted because layout could not be parsed",
        { widgetId: _widgetId });
      return null;
    }
    const common = Object.assign({ tab: tabIdx }, layout);
    if (_widget.localFilters !== undefined && _widget.localFilters !== null) {
      pushDiagnostic(_diagnostics, "WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED", "v2 widget localFilters are not persisted in v3",
        { widgetId: _widgetId });
    }
    const kind = normalizeWidgetType(_widget.widgetType);
    if (kind === "live" || kind === "vis") {
      const vis = mapVisWidget(_widget, common);
      if (!vis) {
        pushDiagnostic(_diagnostics, "WRITEBACK_SKIPPED_BY_DESIGN", "v2 vis widget omitted because data.code or visualType is missing",
          { widgetId: _widgetId });
      }
      return vis;
    }
    if (kind === "text" || kind === "txt") {
      return mapTxtWidget(_widget, common);
    }
    pushDiagnostic(_diagnostics, "WRITEBACK_WIDGET_KIND_UNSUPPORTED", "v2 widget kind is not supported in tranche 1",
      { widgetId: _widgetId, widgetType: _widget.widgetType });
    return null;
  }

  function mapV2Widgets(_payload, _diagnostics) {
    const widgetsObj = _payload.widgets;
    if (!widgetsObj || typeof widgetsObj !== "object") {
      return null;
    }
    const widgetIds = Object.keys(widgetsObj);
    const wgts = [];
    for (let index = 0; index < widgetIds.length; index += 1) {
      const widgetId = widgetIds[index];
      const mapped = mapV2WidgetEntry(widgetsObj[widgetId], widgetId, _diagnostics);
      if (mapped) {
        wgts.push(mapped);
      }
    }
    return wgts.length > 0 ? wgts : null;
  }

  return mapV2Widgets;
});
