define([
  "./config.js",
  "./launchpadRoute.js",
  "./state/selectors.js",
  "./view/resolveWidgetShell.js",
  "./runtime.js",
  "../../tabs/effects/hasTabInnerFrame.js",
  "../../../core/cognosHost/config/widgetChromeSelectors.js",
  "../../../core/utils/kit/async.js"
], function (_config, _launchpadRoute, _selectors, _shellModule, _runtime, _hasTabInnerFrame, _widgetChrome, _async) {
  "use strict";

  // Bounded DOM waits so hidden-tab shells cannot stall tab-scoped discovery.
  var WAIT_TIMEOUT_MS = 2000;
  var POLL_INTERVAL_MS = 100;
  // Quiet after last shell appearance means Cognos' insertion burst is over.
  var SETTLE_QUIET_MS = 400;

  // Tab-scoped passes (options.tabId set) first wait, bounded, for the target tab container and for the DOM
  // shells of widgets attributable to that tab, so containment scoping and routing operate on rendered shells
  // (lazyLaunchpadRouting delta §3.4a).
  function discoverCanvasWidgets(_KDB, _options) {
    var options = Object.assign({}, _options);
    if (options.tabId) {
      options.otherTabAliases = readOtherTabAliases(_KDB, options.tabId);
    }
    return waitForTabContainer(_KDB, options.tabId).then(function () {
      var canvasItems = readCanvasItems(_KDB);
      return waitForScopedShells(_KDB, canvasItems, options).then(function () {
        var helperTabIds = readHelperTabIds(_KDB);
        var descriptors = [];
        for (var index = 0; index < canvasItems.length; index += 1) {
          var descriptor = buildDescriptor(_KDB, canvasItems[index], helperTabIds, options);
          if (descriptor) {
            descriptors.push(descriptor);
          }
        }
        return descriptors;
      });
    });
  }

  function readCanvasItems(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetBase : null;
    var canvasFacet = rt && rt.canvasFacet ? rt.canvasFacet : null;
    if (!canvasFacet || typeof canvasFacet.listCanvasWidgets !== "function") {
      return [];
    }
    try {
      var outcome = canvasFacet.listCanvasWidgets();
      if (outcome && outcome.ok === true && Array.isArray(outcome.data)) {
        return outcome.data;
      }
    } catch (err) {
      console.error("[widgetBase.discoverCanvasWidgets] listCanvasWidgets failed", err);
    }
    return [];
  }

  function readHelperTabIds(_KDB) {
    if (_KDB.state && _KDB.state.launchpad && Array.isArray(_KDB.state.launchpad.helperTabIds)) {
      return _KDB.state.launchpad.helperTabIds.slice();
    }
    return [];
  }

  function resolveWidgetId(_item) {
    if (typeof _item === "string") {
      return _item;
    }
    if (_item && _item.widgetId) {
      return _item.widgetId;
    }
    if (_item && _item.id) {
      return _item.id;
    }
    return null;
  }

  function resolveOwnTabId(_item) {
    return _item && _item.tabId ? _item.tabId : null;
  }

  // Tab-scoped discovery (lazyLaunchpadRouting delta §3.1): when the caller targets one tab, only widgets whose
  // shell lives inside that tab's DOM container are in scope. The tab container element id equals the tabs state
  // tabId (kdbControl-tabFollow delta §2); DOM containment is reliable where Cognos layout ids are not.
  // Shell-less widgets attributable to another tab (model container id in otherTabAliases) are equally out of
  // scope; without this they would surface as missing shells forever.
  function buildDescriptor(_KDB, _item, _helperTabIds, _options) {
    var widgetId = resolveWidgetId(_item);
    if (!widgetId) {
      return null;
    }
    var ownTabId = resolveOwnTabId(_item);
    if (_options.tabId && isShellOutsideTab(_KDB, widgetId, _options.tabId)) {
      return null;
    }
    if (_options.tabId && ownTabId && _options.otherTabAliases && _options.otherTabAliases[ownTabId] === true) {
      return null;
    }
    var tabId = ownTabId || _options.tabId || null;
    if (tabId && _helperTabIds.indexOf(tabId) >= 0) {
      return null;
    }
    // Widgets widgetBase state already tracks (onCanvas or parked on the launchpad) are KDB-owned, not
    // pre-existing Cognos widgets: lazy routing must never (re)park them (delta §1/§3).
    if (_selectors.readPlacement(_KDB, widgetId) !== undefined) {
      return { widgetId: widgetId, tabId: tabId, skipReason: "WIDGET_BASE_WIDGET_ALREADY_OWNED" };
    }
    var descriptor = Object.assign({}, readWidgetMeta(_KDB, widgetId, _item), {
      widgetId: widgetId,
      tabId: tabId,
      tabHandle: _item && _item.tabHandle != null ? _item.tabHandle : 0,
      isStartupDiscovery: true,
      isHostWidget: isHostWidget(_KDB, widgetId)
    });
    stampLaunchpadDisabled(_KDB, descriptor);
    var route = _launchpadRoute.resolveLaunchpadRoute(descriptor);
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

  function readWidgetMeta(_KDB, _widgetId, _item) {
    var meta = {
      widgetType: _item ? firstNonEmpty(_item.widgetType, _item.type) : null,
      visualType: _item ? firstNonEmpty(_item.visualType, _item.visType, _item.visualizationType) : null,
      visualTitle: _item ? firstNonEmpty(_item.visualTitle, _item.visTitle, _item.title, _item.visualName, _item.name, _item.display, _item.langtext) : null,
      // resolveLaunchpadRoute treats isLiveWidget as "this is a vis" before list/hierarchy, while the canvas
      // descriptor flag means contentType "widget.live"; live canvas handles never carried it, so never copy it.
      isLiveWidget: false,
      isTextWidget: _item && _item.isTextWidget === true
    };
    if (String(meta.widgetType || "").toUpperCase() === "TEXT") {
      meta.widgetType = "WIDGET.TEXT";
      meta.isTextWidget = true;
    }
    var strings = _widgetChrome.widget.strings;
    var shellEl = _shellModule.resolveWidgetShell(_KDB, _widgetId);
    if (shellEl && (shellEl.classList.contains(strings.textWidgetClassName) || shellEl.querySelector(strings.textWidgetClass))) {
      meta.widgetType = "WIDGET.TEXT";
      meta.isTextWidget = true;
    }
    return meta;
  }

  function firstNonEmpty() {
    for (var index = 0; index < arguments.length; index += 1) {
      if (arguments[index] != null && String(arguments[index]).trim() !== "") {
        return String(arguments[index]).trim();
      }
    }
    return null;
  }

  function stampLaunchpadDisabled(_KDB, _descriptor) {
    var tables = _KDB && _KDB.config && _KDB.config.tables;
    if (!tables) {
      return;
    }
    var keys = Object.keys(tables);
    for (var index = 0; index < keys.length; index += 1) {
      var entry = tables[keys[index]];
      if (entry && entry.launchpad === false && String(entry.name).trim() === _descriptor.visualTitle) {
        _descriptor.launchpad = false;
        return;
      }
    }
  }

  function isHostWidget(_KDB, _widgetId) {
    return _widgetId === _config.HOST_WIDGET_ID || !!(_KDB.elements && _KDB.elements.kdbWidget && _KDB.elements.kdbWidget.id === _widgetId);
  }

  // Exclude only on positive DOM evidence: both the tab container element (id === tabId) and the widget shell
  // resolve, and the shell is outside the container. Unresolvable elements never exclude.
  function isShellOutsideTab(_KDB, _widgetId, _targetTabId) {
    if (typeof document === "undefined" || !document.getElementById) {
      return false;
    }
    var tabEl = document.getElementById(_targetTabId);
    var shellEl = _shellModule.resolveWidgetShell(_KDB, _widgetId);
    if (!tabEl || !shellEl || typeof tabEl.contains !== "function") {
      return false;
    }
    return !tabEl.contains(shellEl);
  }

  // One poll per key: a newer poll aborts the previous one. Every outcome (ready, timeout, aborted, check
  // failure) resolves undefined; a failing check is logged and ends the wait.
  function pollKeyed(_KDB, _key, _check) {
    _runtime.ensureWidgetBaseRuntime(_KDB);
    var controllers = _KDB.runtime.widgetBase.abortControllers;
    if (controllers[_key] && typeof controllers[_key].abort === "function") {
      controllers[_key].abort();
    }
    var controller = new AbortController();
    controllers[_key] = controller;
    function check() {
      try {
        return _check();
      } catch (err) {
        console.error("[widgetBase.discovery] poll check failed", _key, err);
        return true;
      }
    }
    return _async.pollUntil({ check: check, timeoutMs: WAIT_TIMEOUT_MS, intervalMs: POLL_INTERVAL_MS, signal: controller.signal })
      .then(function (result) {
        var rt = _KDB.runtime && _KDB.runtime.widgetBase;
        if (result.reason !== "aborted" && rt && rt.abortControllers && rt.abortControllers[_key] === controller) {
          delete rt.abortControllers[_key];
        }
      });
  }

  // Tab inner frame may be missing on first activation; timeout proceeds.
  function waitForTabContainer(_KDB, _tabId) {
    if (!_tabId || typeof document === "undefined" || !document.getElementById) {
      return Promise.resolve();
    }
    return pollKeyed(_KDB, "tabContainerPoll:" + _tabId, function () {
      return _hasTabInnerFrame(_KDB, _tabId);
    });
  }

  // Await DOM shells for this tab only; other-tab aliases are excluded from the wait. Stops when all pending
  // shells are present, after SETTLE_QUIET_MS without a new shell, or at WAIT_TIMEOUT_MS.
  function waitForScopedShells(_KDB, _canvasItems, _options) {
    if (!_options.tabId) {
      return Promise.resolve();
    }
    var pendingWidgetIds = readPendingWidgetIds(_KDB, _canvasItems, _options.otherTabAliases || {});
    if (pendingWidgetIds.length === 0) {
      return Promise.resolve();
    }
    var lastPresentCount = 0;
    var lastProgressAt = Date.now();
    return pollKeyed(_KDB, "scopedShellsPoll:" + _options.tabId, function () {
      var presentCount = countPresentShells(_KDB, pendingWidgetIds);
      if (presentCount > lastPresentCount) {
        lastPresentCount = presentCount;
        lastProgressAt = Date.now();
      }
      return presentCount === pendingWidgetIds.length || Date.now() - lastProgressAt >= SETTLE_QUIET_MS;
    });
  }

  function readPendingWidgetIds(_KDB, _canvasItems, _otherTabAliases) {
    var pending = [];
    for (var index = 0; index < _canvasItems.length; index += 1) {
      var widgetId = resolveWidgetId(_canvasItems[index]);
      if (!widgetId || _shellModule.resolveWidgetShell(_KDB, widgetId)) {
        continue;
      }
      var ownTabId = resolveOwnTabId(_canvasItems[index]);
      if (ownTabId && _otherTabAliases[ownTabId] === true) {
        continue;
      }
      pending.push(widgetId);
    }
    return pending;
  }

  function countPresentShells(_KDB, _widgetIds) {
    var count = 0;
    for (var index = 0; index < _widgetIds.length; index += 1) {
      if (_shellModule.resolveWidgetShell(_KDB, _widgetIds[index])) {
        count += 1;
      }
    }
    return count;
  }

  // Other tabs' tabId/pageId; unreadable tabs state just means we wait.
  function readOtherTabAliases(_KDB, _targetTabId) {
    var aliases = {};
    try {
      var tabsApi = _KDB.api ? _KDB.api.tabs : null;
      var tabsState = tabsApi && typeof tabsApi.getState === "function" ? tabsApi.getState() : null;
      var tabTargets = tabsState && tabsState.tabTargets ? tabsState.tabTargets : {};
      Object.keys(tabTargets).forEach(function (tabIdx) {
        var target = tabTargets[tabIdx] || {};
        if (target.tabId === _targetTabId || target.pageId === _targetTabId) {
          return;
        }
        if (target.tabId) { aliases[target.tabId] = true; }
        if (target.pageId) { aliases[target.pageId] = true; }
      });
    } catch (_err) {
      return {};
    }
    return aliases;
  }

  return {
    discoverCanvasWidgets: discoverCanvasWidgets,
    waitForTabContainer: waitForTabContainer,
    waitForScopedShells: waitForScopedShells,
    readOtherTabAliases: readOtherTabAliases
  };
});
