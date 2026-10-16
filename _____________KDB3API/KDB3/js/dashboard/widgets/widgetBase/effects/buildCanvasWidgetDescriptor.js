define([
  "../state/resolveLaunchpadRoute.js",
  "../state/selectors.js",
  "../view/resolveWidgetShell.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_resolveLaunchpadRoute, _selectors, _shellModule, _widgetChrome) {
  function buildCanvasWidgetDescriptor(_KDB, item, helperTabIds, options, sources) {
    const widgetId = sources.resolveWidgetId(item);
    if (!widgetId) {
      return null;
    }
    // Tab-scoped discovery (lazyLaunchpadRouting delta §3.1): when the caller
    // targets one tab, only widgets whose shell lives inside that tab's DOM
    // container are in scope. The tab container element id equals the tabs
    // state tabId (kdbControl-tabFollow delta §2); id-namespace comparisons
    // against Cognos layout ids are unreliable, DOM containment is not.
    // Shell-less widgets attributable to another tab (model container id in
    // otherTabAliases, provided by discoverCanvasWidgets) are equally out of
    // scope — without this they would surface as missing shells forever.
    const ownTabId = sources.resolveOwnTabId(_KDB, item);
    if (options.tabId && isShellOutsideTab(_KDB, widgetId, options.tabId)) {
      return null;
    }
    if (options.tabId && ownTabId && options.otherTabAliases && options.otherTabAliases[ownTabId] === true) {
      return null;
    }
    const tabId = ownTabId || options.tabId || null;
    if (tabId && helperTabIds.indexOf(tabId) >= 0) {
      return null;
    }
    // Widgets widgetBase state already tracks (onCanvas or parked on the
    // launchpad) are KDB-owned, not "pre-existing Cognos widgets": lazy
    // routing must never (re)park them (delta §1/§3).
    if (isOwnedWidget(_KDB, widgetId)) {
      return { widgetId: widgetId, tabId: tabId, skipReason: "WIDGET_BASE_WIDGET_ALREADY_OWNED" };
    }
    const meta = readWidgetMeta(_KDB, widgetId, item);
    const descriptor = Object.assign({}, meta, {
      widgetId: widgetId,
      tabId: tabId,
      tabHandle: item && item.tabHandle != null ? item.tabHandle : 0,
      isStartupDiscovery: true,
      isHostWidget: isHostWidget(_KDB, widgetId)
    });
    stampLaunchpadDisabled(_KDB, descriptor);
    const route = _resolveLaunchpadRoute(descriptor);
    if (!_shellModule.resolveWidgetShell(_KDB, widgetId)) {
      descriptor.skipReason = "WIDGET_BASE_WIDGET_ID_MISSING";
    } else if (route.shouldRoute === false && route.reasonCode) {
      descriptor.skipReason = route.reasonCode;
    } else if (route.tabId && !descriptor.tabId) {
      descriptor.tabId = route.tabId;
    }
    descriptor.route = route;
    return descriptor;
  }

  function readWidgetMeta(_KDB, widgetId, item) {
    const meta = {
      widgetType: item ? firstNonEmpty(item.widgetType, item.type) : null,
      visualType: item ? firstNonEmpty(item.visualType, item.visType, item.visualizationType) : null,
      visualTitle: item ? firstNonEmpty(item.visualTitle, item.visTitle, item.title, item.visualName, item.name, item.display, item.langtext) : null,
      // CanvasWidgetDescriptor.isLiveWidget means contentType === "widget.live"
      // (tableData). resolveLaunchpadRoute treats the same flag as "this is a
      // vis" *before* list/hierarchy, so discovery must not copy it — live
      // canvas handles never had that property (backup: item.isLiveWidget === true).
      isLiveWidget: false,
      isTextWidget: item && item.isTextWidget === true
    };
    if (String(meta.widgetType || "").toUpperCase() === "TEXT") {
      meta.widgetType = "WIDGET.TEXT";
      meta.isTextWidget = true;
    }
    const shellEl = _shellModule.resolveWidgetShell(_KDB, widgetId);
    if (shellEl && (shellEl.classList.contains(_widgetChrome.widget.strings.textWidgetClassName) || shellEl.querySelector(_widgetChrome.widget.strings.textWidgetClass))) {
      meta.widgetType = "WIDGET.TEXT";
      meta.isTextWidget = true;
    }
    return meta;
  }

  function firstNonEmpty() {
    for (let index = 0; index < arguments.length; index += 1) {
      if (arguments[index] != null && String(arguments[index]).trim() !== "") {
        return String(arguments[index]).trim();
      }
    }
    return null;
  }

  function stampLaunchpadDisabled(_KDB, descriptor) {
    const tables = _KDB && _KDB.config && _KDB.config.tables;
    if (!tables) {
      return;
    }
    const keys = Object.keys(tables);
    for (let index = 0; index < keys.length; index += 1) {
      const entry = tables[keys[index]];
      if (entry && entry.launchpad === false && String(entry.name).trim() === descriptor.visualTitle) {
        descriptor.launchpad = false;
        return;
      }
    }
  }

  function isHostWidget(_KDB, widgetId) {
    return widgetId === "kdb3widget" || !!(_KDB.elements && _KDB.elements.kdbWidget && _KDB.elements.kdbWidget.id === widgetId);
  }

  function isOwnedWidget(_KDB, widgetId) {
    return _selectors.readPlacement(_KDB, widgetId) !== undefined;
  }

  // Exclude only on positive DOM evidence: both the tab container element
  // (id === tabId) and the widget shell resolve, and the shell is outside the
  // container. Unresolvable elements never exclude — the ownership guard and
  // the shell-missing skip below stay the safety net.
  function isShellOutsideTab(_KDB, widgetId, targetTabId) {
    if (typeof document === "undefined" || !document.getElementById) {
      return false;
    }
    const tabEl = document.getElementById(targetTabId);
    const shellEl = _shellModule.resolveWidgetShell(_KDB, widgetId);
    if (!tabEl || !shellEl || typeof tabEl.contains !== "function") {
      return false;
    }
    return !tabEl.contains(shellEl);
  }

  return buildCanvasWidgetDescriptor;
});
