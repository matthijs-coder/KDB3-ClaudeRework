define([
  "../config/launchpadChannels.js",
  "../view/resolveWidgetShell.js"
], function (_launchpadChannels, _shellModule) {
  function resolveClaimedWidget(context, dropRequest) {
    const tabId = dropRequest.tabId;
    const sourceKind = dropRequest.sourceKind || "unknown";
    if (dropRequest.draggedElementType === "visualization" || sourceKind === "metricsTreeLeaf") {
      return claimFromPad(context, _launchpadChannels.CHANNELS.VISUALIZATION, tabId).then(function (claim) {
        if (claim && claim.widgetId) {
          return { ok: true, widgetId: claim.widgetId, shellEl: claim.shellEl };
        }
        if (sourceKind === "metricsTreeLeaf") {
          return missingShellResult(claim && claim.isEligibleListEmpty === true);
        }
        return Promise.resolve(resolveDirectClaim(context, dropRequest));
      });
    }
    if (dropRequest.draggedElementType === "text" || sourceKind === "toolboxTextButton") {
      return claimFromPad(context, _launchpadChannels.CHANNELS.TEXT, tabId).then(function (claim) {
        if (claim && claim.widgetId) {
          return { ok: true, widgetId: claim.widgetId, shellEl: claim.shellEl };
        }
        if (sourceKind === "toolboxTextButton") {
          return missingShellResult(claim && claim.isEligibleListEmpty === true);
        }
        return Promise.resolve(resolveDirectClaim(context, dropRequest));
      });
    }
    return Promise.resolve(resolveDirectClaim(context, dropRequest));
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
  function missingShellResult(isEligibleListEmpty) {
    const result = { ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING", errorMessage: "No eligible widget shell could be claimed." };
    if (isEligibleListEmpty === true) {
      result.isEligibleListEmpty = true;
    }
    return result;
  }
  function claimFromPad(context, padKey, tabId) {
    const _KDB = context._KDB;
    if (!_KDB || !_KDB.api || !_KDB.api.launchpad || typeof _KDB.api.launchpad.dispatch !== "function") {
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
        return emptyListMarker();
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
      return emptyListMarker();
    });
  }
  function claimFirstEligibleFromDiscovery(context, widgets) {
    let sawUnevaluable = false;
    let index = 0;
    while (index < widgets.length) {
      if (readHasContentState(context, widgets[index].widgetId) === "unevaluable") {
        sawUnevaluable = true;
        index += 1;
        continue;
      }
      const claim = _shellModule.claimShellById(context._KDB, widgets[index].widgetId, claimOptions(context, { requireLaunchpadSlot: true }));
      if (claim && claim.widgetId) {
        return claim;
      }
      index += 1;
    }
    if (sawUnevaluable === true) {
      return { sawUnevaluable: true };
    }
    return null;
  }
  function claimOptions(context, extra) {
    const options = extra ? Object.assign({}, extra) : {};
    options.hasContent = function (widgetId) {
      return widgetHasContent(context, widgetId);
    };
    return options;
  }
  function widgetHasContent(context, widgetId) {
    return readHasContentState(context, widgetId) === "yes";
  }
  function emptyListMarker() {
    return { isEligibleListEmpty: true };
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
  function readPadShellEligibility(context, widgetId) {
    const state = readHasContentState(context, widgetId);
    if (state === "unevaluable") {
      return "unevaluable";
    }
    const claim = _shellModule.claimShellById(context._KDB, widgetId, claimOptions(context, { requireLaunchpadSlot: true }));
    return claim && claim.widgetId ? "yes" : "no";
  }
  resolveClaimedWidget.readPadShellEligibility = readPadShellEligibility;
  return resolveClaimedWidget;
});

