define([
  "../../schema/errorCodes.js",
  "../../../../config/dropdownDefaults.js",
  "../../../../../dashboard/widgets/widgetVis/config/visTypeRules.js",
  "./collectorSupport.js",
], function (_errorCodes, _dropdownDefaults, _visTypeRules, _support) {
  "use strict";

  // Builds a single v3 `wgts` object per contracts/writeback.md §4.5.1.
  // Delta encoding: optional keys are omitted when the owner default applies
  // (dim/topn "none", colours "#ffffff", fontSize "automatic", style default).

  const VIS_TYPE_DEFAULT = _dropdownDefaults.visualization.useValue;
  const DIMENSION_DEFAULT = _dropdownDefaults.dimension.useValue;
  const TOP_N_DEFAULT = _dropdownDefaults.topN.useValue;
  const COLOUR_DEFAULT = _dropdownDefaults.backgroundColor.useValue;
  const RESTYLE_DEFAULT = _dropdownDefaults.layout.useValue;

  function buildWidgetObject(frame, tabIdx, settingsRecord, visRecord, textRecord, diagnostics) {
    const widgetId = frame && frame.widgetId ? frame.widgetId : null;
    const common = buildCommon(tabIdx, frame, diagnostics, widgetId);
    if (!common) {
      return null;
    }
    if (frame.kind === "vis") {
      return buildVisObject(common, frame, settingsRecord, visRecord, diagnostics, widgetId);
    }
    return buildTxtObject(common, frame, settingsRecord, textRecord);
  }

  function buildCommon(tabIdx, frame, diagnostics, widgetId) {
    const layout = frame.layout || {};
    const numbers = [tabIdx, layout.x, layout.y, layout.width, layout.height];
    for (let index = 0; index < numbers.length; index += 1) {
      if (!Number.isFinite(numbers[index])) {
        diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
          "get",
          "widget layout or tab index contains a non-finite number",
          { widgetId: widgetId }
        ));
        return null;
      }
    }
    return {
      tab: numbers[0], x: numbers[1], y: numbers[2], w: numbers[3], h: numbers[4],
      kind: frame.kind === "text" ? "txt" : "vis",
    };
  }

  function buildVisObject(common, frame, settingsRecord, visRecord, diagnostics, widgetId) {
    const settings = settingsRecord || {};
    const derived = visRecord && visRecord.derived ? visRecord.derived : null;
    const metricCode = derived && typeof derived.code === "string" ? derived.code.trim() : "";
    if (metricCode === "") {
      diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_WIDGET_RESTORE_FAILED,
        "get",
        "vis widget missing metricCode in derived.code",
        { widgetId: widgetId }
      ));
      return null;
    }
    common.code = metricCode;
    common.type = settings.visType != null ? settings.visType : VIS_TYPE_DEFAULT;
    assignOptionalString(common, "dim", settings.dimension, DIMENSION_DEFAULT);
    assignOptionalString(common, "topn", settings.topNChoice, TOP_N_DEFAULT);
    _support.assignOptionalFlag01(common, "vals", settings.showValues);
    if (_visTypeRules.isAllowedGrain(_visTypeRules.resolveBucket(common.type), settings.grouping)) {
      common.grp = settings.grouping;
    }
    _support.assignOptionalFlag01(common, "iter", settings.iterator);
    _support.assignOptionalFlag01(common, "wzbar", settings.zoom);
    _support.assignOptionalFlag01(common, "vcap", settings.valueCaption);
    assignOptionalColour(common, "bgcol", frame.colour);
    assignOptionalColour(common, "ctcol", settings.colour);
    return common;
  }

  function buildTxtObject(common, frame, settingsRecord, textRecord) {
    const settings = settingsRecord || {};
    const content = textRecord && textRecord.content ? textRecord.content : null;
    common.text = content && typeof content.text === "string" ? content.text : "";
    const fsize = parseLeadingInteger(settings.fontSize);
    if (fsize !== null) {
      common.fsize = fsize; // non-numeric owner token ("automatic") = default -> omit
    }
    const shellSource = settings.colour != null ? settings.colour : frame.colour;
    assignOptionalColour(common, "bgcol", shellSource);
    assignOptionalString(common, "style", settings.restyle, RESTYLE_DEFAULT);
    return common;
  }

  function assignOptionalString(target, key, value, defaultValue) {
    if (value == null || String(value) === String(defaultValue)) {
      return;
    }
    target[key] = value;
  }

  function assignOptionalColour(target, key, value) {
    if (value == null || value === "") {
      return;
    }
    if (String(value).toLowerCase() === String(COLOUR_DEFAULT).toLowerCase()) {
      return;
    }
    target[key] = value;
  }

  function parseLeadingInteger(token) {
    if (token == null) {
      return null;
    }
    const match = String(token).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  return buildWidgetObject;
});
