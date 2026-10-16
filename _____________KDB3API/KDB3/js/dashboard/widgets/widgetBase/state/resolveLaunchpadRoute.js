define(["../config/launchpadChannels.js"], function (_launchpadChannels) {
  function resolveLaunchpadRoute(_descriptor) {
    const descriptor = normalizeDescriptor(_descriptor || {});
    const skip = buildSkipRoute(descriptor);
    if (skip) {
      return skip;
    }
    const tabId = descriptor.tabId || null;
    if (!tabId) {
      return buildFailRoute("WIDGET_BASE_TAB_UNRESOLVED");
    }
    return buildActiveRoute(descriptor, tabId);
  }
  function buildSkipRoute(descriptor) {
    if (descriptor.isHostWidget === true) {
      return { shouldRoute: false, reasonCode: _launchpadChannels.SKIP_REASON.HOST_WIDGET, kind: null, role: null, launchpadPad: null, tabId: descriptor.tabId || null, tabHandle: descriptor.tabHandle || 0 };
    }
    if (isWritebackDescriptor(descriptor)) {
      return { shouldRoute: false, reasonCode: _launchpadChannels.SKIP_REASON.WRITEBACK_TABLE, kind: null, role: null, launchpadPad: null, tabId: descriptor.tabId || null, tabHandle: descriptor.tabHandle || 0 };
    }
    if (descriptor.launchpad === false) { return { shouldRoute: false, reasonCode: _launchpadChannels.SKIP_REASON.LAUNCHPAD_DISABLED, kind: null, role: null, launchpadPad: null, tabId: descriptor.tabId || null, tabHandle: descriptor.tabHandle || 0 }; }
    return null;
  }
  function buildFailRoute(reasonCode) {
    return { shouldRoute: false, reasonCode: reasonCode, kind: null, role: null, launchpadPad: null, tabId: null, tabHandle: 0 };
  }
  function buildActiveRoute(descriptor, tabId) {
    const textRoute = resolveTextRoute(descriptor, tabId);
    if (textRoute) {
      return textRoute;
    }
    const visRoute = resolveVisRoute(descriptor, tabId);
    if (visRoute) {
      return visRoute;
    }
    const topNRoute = resolveTopNRoute(descriptor, tabId);
    if (topNRoute) {
      return topNRoute;
    }
    const datatableRoute = resolveDatatableRoute(descriptor, tabId);
    if (datatableRoute) {
      return datatableRoute;
    }
    return { shouldRoute: true, reasonCode: null, kind: "other", role: "otherResource", launchpadPad: _launchpadChannels.CHANNELS.OTHER_RESOURCES, tabId: tabId, tabHandle: descriptor.tabHandle || 0 };
  }
  function resolveTextRoute(descriptor, tabId) {
    if (descriptor.widgetType === "WIDGET.TEXT" || descriptor.isTextWidget === true || descriptor.kind === "text" || descriptor.draggedElementType === "text" || descriptor.sourceKind === "toolboxTextButton") {
      return { shouldRoute: true, reasonCode: null, kind: "text", role: "primary", launchpadPad: _launchpadChannels.CHANNELS.TEXT, tabId: tabId, tabHandle: descriptor.tabHandle || 0 };
    }
    return null;
  }
  function resolveVisRoute(descriptor, tabId) {
    if (isChartType(descriptor.visualType) || descriptor.draggedElementType === "visualization" || descriptor.draggedElementType === "metric" || descriptor.sourceKind === "metricsTreeLeaf" || descriptor.isLiveWidget === true || descriptor.kind === "vis" || descriptor.widgetType === "WIDGET.VISUALIZATION") {
      return { shouldRoute: true, reasonCode: null, kind: "vis", role: "primary", launchpadPad: _launchpadChannels.CHANNELS.VISUALIZATION, tabId: tabId, tabHandle: descriptor.tabHandle || 0 };
    }
    return null;
  }
  function resolveTopNRoute(descriptor, tabId) {
    const isList = descriptor.visualType === "LIST" || descriptor.draggedElementType === "list";
    const hasTitle = hasNonEmptyTitle(descriptor.visualTitle);
    const allowTopN = descriptor.isStartupDiscovery === true || descriptor.isTopNHelperClaim === true || descriptor.isHistoryReplay === true;
    if (isList && !hasTitle && allowTopN) {
      return { shouldRoute: true, reasonCode: null, kind: "topN", role: "topNHelper", launchpadPad: _launchpadChannels.CHANNELS.TOP_N, tabId: tabId, tabHandle: descriptor.tabHandle || 0 };
    }
    return null;
  }
  function resolveDatatableRoute(descriptor, tabId) {
    const isListOrHierarchy = isDataWidgetType(descriptor.visualType) || descriptor.draggedElementType === "list" || descriptor.draggedElementType === "hierarchy";
    if (isListOrHierarchy) {
      return { shouldRoute: true, reasonCode: null, kind: "datatable", role: "primary", launchpadPad: _launchpadChannels.CHANNELS.DATA_TABLES, tabId: tabId, tabHandle: descriptor.tabHandle || 0 };
    }
    return null;
  }
  function normalizeDescriptor(raw) {
    const widgetId = firstNonEmpty(raw.widgetId, raw.id);
    const widgetTypeRaw = normalizeUpper(firstNonEmpty(raw.widgetType, raw.type));
    const widgetType = widgetTypeRaw === "TEXT" ? "WIDGET.TEXT" : widgetTypeRaw;
    const visualType = normalizeUpper(firstNonEmpty(raw.visualType, raw.visType, raw.visualizationType));
    const visualTitle = firstNonEmpty(raw.visualTitle, raw.title, raw.visualName, raw.name, raw.display, raw.langtext);
    const draggedElementType = normalizeLower(firstNonEmpty(raw.draggedElementType, raw.draggType, raw.dragType));
    return Object.assign({}, raw, {
      widgetId: widgetId,
      widgetType: widgetType,
      visualType: visualType,
      visualTitle: visualTitle,
      draggedElementType: draggedElementType,
      kind: normalizeLower(raw.kind),
      sourceKind: raw.sourceKind || null,
      tabId: raw.tabId || null,
      tabHandle: raw.tabHandle != null ? raw.tabHandle : 0,
      isHostWidget: raw.isHostWidget === true || widgetId === "kdb3widget",
      isTextWidget: raw.isTextWidget === true,
      isLiveWidget: raw.isLiveWidget === true,
      isStartupDiscovery: raw.isStartupDiscovery === true,
      isTopNHelperClaim: raw.isTopNHelperClaim === true,
      isHistoryReplay: raw.isHistoryReplay === true
    });
  }
  function firstNonEmpty() {
    let index = 0;
    while (index < arguments.length) {
      if (arguments[index] != null && String(arguments[index]).trim() !== "") {
        return String(arguments[index]).trim();
      }
      index += 1;
    }
    return null;
  }
  function normalizeUpper(value) {
    return String(value || "").trim().toUpperCase();
  }
  function normalizeLower(value) {
    return String(value || "").trim().toLowerCase();
  }
  function isWritebackDescriptor(descriptor) {
    const normalized = normalizeTitle(firstNonEmpty(descriptor.visualTitle, descriptor.kind, descriptor.widgetType));
    let index = 0;
    while (index < _launchpadChannels.WRITE_BACK_TITLES.length) {
      if (normalized === _launchpadChannels.WRITE_BACK_TITLES[index]) {
        return true;
      }
      index += 1;
    }
    return false;
  }
  function normalizeTitle(title) {
    return String(title || "").trim().toLowerCase().replace(/\s+/g, "");
  }
  function hasNonEmptyTitle(title) {
    return normalizeTitle(title) !== "";
  }
  function isChartType(visualType) {
    const normalized = normalizeUpper(visualType);
    let index = 0;
    while (index < _launchpadChannels.CHART_TYPES.length) {
      if (_launchpadChannels.CHART_TYPES[index] === normalized) {
        return true;
      }
      index += 1;
    }
    return false;
  }
  function isDataWidgetType(visualType) {
    const normalized = normalizeUpper(visualType);
    return normalized === "LIST" || normalized === "HIERARCHY" || normalized === "TABLE" || normalized === "CROSSTAB";
  }
  return resolveLaunchpadRoute;
});
