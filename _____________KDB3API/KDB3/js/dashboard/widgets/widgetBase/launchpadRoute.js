define(["./config.js", "./view/resolveWidgetShell.js"], function (_config, _shellModule) {
  "use strict";

  const CHANNELS = _config.CHANNELS;

  function firstNonEmpty() {
    for (let index = 0; index < arguments.length; index += 1) {
      if (arguments[index] != null && String(arguments[index]).trim() !== "") {
        return String(arguments[index]).trim();
      }
    }
    return null;
  }

  function normalizeUpper(value) {
    return String(value || "").trim().toUpperCase();
  }

  function normalizeLower(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeTitle(title) {
    return String(title || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function normalizeDescriptor(raw) {
    const widgetId = firstNonEmpty(raw.widgetId, raw.id);
    const widgetTypeRaw = normalizeUpper(firstNonEmpty(raw.widgetType, raw.type));
    return Object.assign({}, raw, {
      widgetId: widgetId,
      widgetType: widgetTypeRaw === "TEXT" ? "WIDGET.TEXT" : widgetTypeRaw,
      visualType: normalizeUpper(firstNonEmpty(raw.visualType, raw.visType, raw.visualizationType)),
      visualTitle: firstNonEmpty(raw.visualTitle, raw.title, raw.visualName, raw.name, raw.display, raw.langtext),
      draggedElementType: normalizeLower(firstNonEmpty(raw.draggedElementType, raw.draggType, raw.dragType)),
      kind: normalizeLower(raw.kind),
      sourceKind: raw.sourceKind || null,
      tabId: raw.tabId || null,
      tabHandle: raw.tabHandle != null ? raw.tabHandle : 0,
      isHostWidget: raw.isHostWidget === true || widgetId === _config.HOST_WIDGET_ID,
      isTextWidget: raw.isTextWidget === true,
      isLiveWidget: raw.isLiveWidget === true,
      isStartupDiscovery: raw.isStartupDiscovery === true,
      isTopNHelperClaim: raw.isTopNHelperClaim === true,
      isHistoryReplay: raw.isHistoryReplay === true
    });
  }

  function isWritebackDescriptor(descriptor) {
    const normalized = normalizeTitle(firstNonEmpty(descriptor.visualTitle, descriptor.kind, descriptor.widgetType));
    return _config.WRITE_BACK_TITLES.indexOf(normalized) >= 0;
  }

  function isChartType(visualType) {
    return _config.CHART_TYPES.indexOf(normalizeUpper(visualType)) >= 0;
  }

  function isDataWidgetType(visualType) {
    const normalized = normalizeUpper(visualType);
    return normalized === "LIST" || normalized === "HIERARCHY" || normalized === "TABLE" || normalized === "CROSSTAB";
  }

  function buildSkipRoute(descriptor, reasonCode) {
    return { shouldRoute: false, reasonCode: reasonCode, kind: null, role: null, launchpadPad: null, tabId: descriptor.tabId || null, tabHandle: descriptor.tabHandle || 0 };
  }

  function findSkipReason(descriptor) {
    if (descriptor.isHostWidget === true) {
      return _config.SKIP_REASON.HOST_WIDGET;
    }
    if (isWritebackDescriptor(descriptor)) {
      return _config.SKIP_REASON.WRITEBACK_TABLE;
    }
    return descriptor.launchpad === false ? _config.SKIP_REASON.LAUNCHPAD_DISABLED : null;
  }

  function buildActiveRoute(descriptor, tabId, kind, role, launchpadPad) {
    return { shouldRoute: true, reasonCode: null, kind: kind, role: role, launchpadPad: launchpadPad, tabId: tabId, tabHandle: descriptor.tabHandle || 0 };
  }

  function isTextDescriptor(descriptor) {
    return descriptor.widgetType === "WIDGET.TEXT" || descriptor.isTextWidget === true || descriptor.kind === "text"
      || descriptor.draggedElementType === "text" || descriptor.sourceKind === "toolboxTextButton";
  }

  function isVisDescriptor(descriptor) {
    return isChartType(descriptor.visualType) || descriptor.draggedElementType === "visualization" || descriptor.draggedElementType === "metric"
      || descriptor.sourceKind === "metricsTreeLeaf" || descriptor.isLiveWidget === true || descriptor.kind === "vis"
      || descriptor.widgetType === "WIDGET.VISUALIZATION";
  }

  function isTopNDescriptor(descriptor) {
    const isList = descriptor.visualType === "LIST" || descriptor.draggedElementType === "list";
    const hasTitle = normalizeTitle(descriptor.visualTitle) !== "";
    const allowTopN = descriptor.isStartupDiscovery === true || descriptor.isTopNHelperClaim === true || descriptor.isHistoryReplay === true;
    return isList && !hasTitle && allowTopN;
  }

  function isDatatableDescriptor(descriptor) {
    return isDataWidgetType(descriptor.visualType) || descriptor.draggedElementType === "list" || descriptor.draggedElementType === "hierarchy";
  }

  function resolveActiveRoute(descriptor, tabId) {
    if (isTextDescriptor(descriptor)) {
      return buildActiveRoute(descriptor, tabId, "text", "primary", CHANNELS.TEXT);
    }
    if (isVisDescriptor(descriptor)) {
      return buildActiveRoute(descriptor, tabId, "vis", "primary", CHANNELS.VISUALIZATION);
    }
    if (isTopNDescriptor(descriptor)) {
      return buildActiveRoute(descriptor, tabId, "topN", "topNHelper", CHANNELS.TOP_N);
    }
    if (isDatatableDescriptor(descriptor)) {
      return buildActiveRoute(descriptor, tabId, "datatable", "primary", CHANNELS.DATA_TABLES);
    }
    return buildActiveRoute(descriptor, tabId, "other", "otherResource", CHANNELS.OTHER_RESOURCES);
  }

  function resolveLaunchpadRoute(_descriptor) {
    const descriptor = normalizeDescriptor(_descriptor || {});
    const skipReason = findSkipReason(descriptor);
    if (skipReason) {
      return buildSkipRoute(descriptor, skipReason);
    }
    const tabId = descriptor.tabId || null;
    if (!tabId) {
      return { shouldRoute: false, reasonCode: "WIDGET_BASE_TAB_UNRESOLVED", kind: null, role: null, launchpadPad: null, tabId: null, tabHandle: 0 };
    }
    return resolveActiveRoute(descriptor, tabId);
  }

  function missingShellResult(isEligibleListEmpty) {
    const result = { ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING", errorMessage: "No eligible widget shell could be claimed." };
    if (isEligibleListEmpty === true) {
      result.isEligibleListEmpty = true;
    }
    return result;
  }

  function isHasContentEvaluable(context) {
    const widgetsFacet = context && context.widgetsFacet;
    return !!(widgetsFacet && typeof widgetsFacet.hasContent === "function");
  }

  function readHasContentState(context, widgetId) {
    if (!isHasContentEvaluable(context)) {
      return "unevaluable";
    }
    try {
      const outcome = context.widgetsFacet.hasContent(widgetId);
      if (!outcome || outcome.ok !== true) {
        return "unevaluable";
      }
      return outcome.data === true ? "yes" : "no";
    } catch (_err) {
      return "unevaluable";
    }
  }

  function claimOptions(context, extra) {
    const options = extra ? Object.assign({}, extra) : {};
    options.hasContent = function (widgetId) {
      return readHasContentState(context, widgetId) === "yes";
    };
    return options;
  }

  function readPadShellEligibility(context, widgetId) {
    if (readHasContentState(context, widgetId) === "unevaluable") {
      return "unevaluable";
    }
    const claim = _shellModule.claimShellById(context._KDB, widgetId, claimOptions(context, { requireLaunchpadSlot: true }));
    return claim && claim.widgetId ? "yes" : "no";
  }

  function claimFirstEligibleFromDiscovery(context, widgets) {
    let sawUnevaluable = false;
    for (let index = 0; index < widgets.length; index += 1) {
      if (readHasContentState(context, widgets[index].widgetId) === "unevaluable") {
        sawUnevaluable = true;
        continue;
      }
      const claim = _shellModule.claimShellById(context._KDB, widgets[index].widgetId, claimOptions(context, { requireLaunchpadSlot: true }));
      if (claim && claim.widgetId) {
        return claim;
      }
    }
    return sawUnevaluable === true ? { sawUnevaluable: true } : null;
  }

  function claimFromPad(context, padKey, tabId) {
    const _KDB = context._KDB;
    if (!_KDB || !_KDB.api || !_KDB.api.launchpad) {
      return Promise.resolve(null);
    }
    return Promise.resolve(_KDB.api.launchpad.dispatch({
      type: "launchpad/readSlotWidgets",
      payload: { padKey: padKey, tabId: tabId, mode: "all" }
    })).then(function (result) {
      if (!result || result.ok !== true) {
        return null;
      }
      const widgets = result.widgets || [];
      if (widgets.length === 0) {
        return { isEligibleListEmpty: true };
      }
      if (isHasContentEvaluable(context) !== true) {
        return null;
      }
      const found = claimFirstEligibleFromDiscovery(context, widgets);
      if (found && found.widgetId) {
        return found;
      }
      if (found && found.sawUnevaluable === true) {
        return null;
      }
      return { isEligibleListEmpty: true };
    });
  }

  function resolveDirectClaim(context, dropRequest) {
    const originClaim = _shellModule.claimShellById(context._KDB, dropRequest.originId, claimOptions(context, { requireLaunchpadSlot: true }));
    if (originClaim) {
      return { ok: true, widgetId: originClaim.widgetId, shellEl: originClaim.shellEl };
    }
    const payloadWidgetId = dropRequest.payload && dropRequest.payload.widgetId ? dropRequest.payload.widgetId : null;
    const payloadClaim = _shellModule.claimShellById(context._KDB, payloadWidgetId, claimOptions(context));
    if (payloadClaim) {
      return { ok: true, widgetId: payloadClaim.widgetId, shellEl: payloadClaim.shellEl };
    }
    return missingShellResult();
  }

  function claimPadOrDirect(context, dropRequest, padKey, strictSourceKind) {
    return claimFromPad(context, padKey, dropRequest.tabId).then(function (claim) {
      if (claim && claim.widgetId) {
        return { ok: true, widgetId: claim.widgetId, shellEl: claim.shellEl };
      }
      if ((dropRequest.sourceKind || "unknown") === strictSourceKind) {
        return missingShellResult(claim && claim.isEligibleListEmpty === true);
      }
      return resolveDirectClaim(context, dropRequest);
    });
  }

  function resolveClaimedWidget(context, dropRequest) {
    const sourceKind = dropRequest.sourceKind || "unknown";
    if (dropRequest.draggedElementType === "visualization" || sourceKind === "metricsTreeLeaf") {
      return claimPadOrDirect(context, dropRequest, CHANNELS.VISUALIZATION, "metricsTreeLeaf");
    }
    if (dropRequest.draggedElementType === "text" || sourceKind === "toolboxTextButton") {
      return claimPadOrDirect(context, dropRequest, CHANNELS.TEXT, "toolboxTextButton");
    }
    return Promise.resolve(resolveDirectClaim(context, dropRequest));
  }

  return {
    resolveLaunchpadRoute: resolveLaunchpadRoute,
    resolveClaimedWidget: resolveClaimedWidget,
    readPadShellEligibility: readPadShellEligibility
  };
});
