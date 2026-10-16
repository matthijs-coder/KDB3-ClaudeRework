// START HERE for settings consequences.
define([], function () {
  function resolveTarget(widgetType, kind) {
    const normalizedKind = normalizeKind(kind);
    if (normalizedKind === "visualization" || normalizedKind === "dimension" || normalizedKind === "topN" || normalizedKind === "showValues" || normalizedKind === "grouping" || normalizedKind === "iterator" || normalizedKind === "zoom" || normalizedKind === "valueCaption") {
      return "widgetVis";
    }
    if (normalizedKind === "title" || normalizedKind === "fontSize") {
      return "widgetText";
    }
    if (normalizedKind === "backgroundColor") {
      return "widgetSettings";
    }
    if (normalizedKind === "layout") {
      return widgetType === "text" ? "widgetText" : "widgetBase";
    }
    if (normalizedKind === "maximize" || normalizedKind === "unmaximize") {
      return "widgetVis";
    }
    if (normalizedKind === "move" || normalizedKind === "resize" || normalizedKind === "reset") {
      return "widgetBase";
    }
    return "widgetBase";
  }

  function resolveType(target, kind, interaction) {
    const normalizedKind = normalizeKind(kind);
    if (target === "widgetVis") {
      return resolveWidgetVisType(normalizedKind);
    }
    if (target === "widgetText") {
      return resolveWidgetTextType(normalizedKind, interaction);
    }
    if (target === "widgetSettings") {
      return resolveWidgetSettingsType(normalizedKind);
    }
    return resolveWidgetBaseType(normalizedKind, interaction);
  }

  function resolveWidgetVisType(normalizedKind) {
    if (normalizedKind === "visualization") { return "widgetVis/applyVisType"; }
    if (normalizedKind === "dimension") { return "widgetVis/applyDimension"; }
    if (normalizedKind === "topN") { return "widgetVis/applyTopNChoice"; }
    if (normalizedKind === "showValues") { return "widgetVis/applyShowValues"; }
    if (normalizedKind === "grouping") { return "widgetVis/applyGrouping"; }
    if (normalizedKind === "iterator" || normalizedKind === "zoom" || normalizedKind === "valueCaption") { return "widgetVis/applyIteratorZoom"; }
    if (normalizedKind === "maximize" || normalizedKind === "unmaximize") { return "widgetVis/maximizeToggle"; }
    return "widgetVis/scaffoldNoop";
  }

  function resolveWidgetTextType(normalizedKind, interaction) {
    if (normalizedKind === "title") { return interaction === "iconClick" ? "widgetText/commitTextEdit" : "widgetText/applyTitle"; }
    if (normalizedKind === "fontSize") { return "widgetText/applyFontSize"; }
    if (normalizedKind === "layout") { return "widgetText/applyRestyle"; }
    return "widgetText/scaffoldNoop";
  }

  function resolveWidgetSettingsType(normalizedKind) {
    if (normalizedKind === "backgroundColor") { return "widgetSettings/commitColour"; }
    return "widgetSettings/scaffoldNoop";
  }

  function resolveWidgetBaseType(normalizedKind, interaction) {
    if (normalizedKind === "move") { return interaction === "dropdownOption" ? "widgetBase/setMoveMode" : "widgetBase/enableMove"; }
    if (normalizedKind === "resize") { return "widgetBase/resizeToggle"; }
    if (normalizedKind === "reset") { return "widgetBase/routeToLaunchpad"; }
    return "widgetBase/scaffoldNoop";
  }

  function normalizeKind(kind) {
    const normalized = String(kind || "").toLowerCase();
    if (normalized === "dimensions") { return "dimension"; }
    if (normalized === "restyle") { return "layout"; }
    if (normalized === "text") { return "title"; }
    if (normalized === "backgroundcolor") { return "backgroundColor"; }
    if (normalized === "topn") { return "topN"; }
    if (normalized === "fontsize") { return "fontSize"; }
    if (normalized === "showvalues") { return "showValues"; }
    if (normalized === "valuecaption") { return "valueCaption"; }
    return normalized;
  }

  return {
    resolveTarget: resolveTarget,
    resolveType: resolveType,
    normalizeKind: normalizeKind
  };
});
