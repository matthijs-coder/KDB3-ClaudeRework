define([
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/runtime.js",
  "../../launchpad/selectors.js",
  "../../tabs/events/eventNames.js",
  "./config.js",
  "./state.js",
  "./runtime.js",
  "./history.js",
  "./canvas.js",
  "./launchpadTransfer.js",
  "./tabWidgets.js",
  "./state/selectors.js",
  "./restore.js",
  "./slotStock/tabMutationOwner.js"
], function (
  _data, _errors, _runtimeKit, _launchpadSelectors, _tabsEventNames, _config, _state, _runtime, _history, _canvas, _transfer, _tabWidgets,
  _selectors, _restore, _tabMutationOwner
) {
  "use strict";

  // Lifecycle terms for widgetBase: idle, initializing, loading, ready, error, disposed.
  const TYPES = _state.ACTION_TYPES;
  const normalizeDispatchResult = _state.normalizeDispatchResult;
  const DROP_VALIDATED_EVENT = "canvas:dropValidated";

  const ROUTES = {};
  ROUTES[TYPES.DROP_CREATE] = _canvas.handleDropCreate;
  ROUTES[TYPES.ROUTE_ALL_TO_LAUNCHPAD] = _tabWidgets.handleRouteAllToLaunchpad;
  ROUTES[TYPES.ENSURE_TAB_WIDGETS_ROUTED] = _tabWidgets.handleEnsureTabWidgetsRouted;
  ROUTES[TYPES.RENDER_TAB_WIDGETS] = _tabWidgets.handleRenderTabWidgets;
  ROUTES[TYPES.ROUTE_TO_LAUNCHPAD] = _transfer.handleRouteToLaunchpad;
  ROUTES[TYPES.TAKE_FROM_LAUNCHPAD] = _transfer.handleTakeFromLaunchpad;
  ROUTES[TYPES.ENABLE_MOVE] = _canvas.handleMoveMode;
  ROUTES[TYPES.SET_MOVE_MODE] = _canvas.handleMoveMode;
  ROUTES[TYPES.RESIZE_TOGGLE] = _canvas.handleResizeToggle;
  ROUTES[TYPES.MOVE] = _canvas.handleMoveOrResize;
  ROUTES[TYPES.RESIZE] = _canvas.handleMoveOrResize;
  ROUTES[TYPES.SET_COLOUR] = _canvas.handleSetColour;
  ROUTES[TYPES.APPLY_COLOUR] = _canvas.handleSetColour;
  ROUTES[TYPES.REMOVE] = _canvas.handleRemove;
  ROUTES[TYPES.PARAMETER_SET_RESET] = _restore.handleParameterSetReset;
  ROUTES[TYPES.PARAMETER_SET_RESTORE] = _restore.handleParameterSetRestore;
  ROUTES[TYPES.PREPARE_TAB_MUTATION] = _tabMutationOwner.handlePrepareTabMutation;
  ROUTES[TYPES.APPLY_TAB_MUTATION] = _tabMutationOwner.handleApplyTabMutation;
  ROUTES[TYPES.RESTORE_TAB_MUTATION_SNAPSHOT] = _tabMutationOwner.handleRestoreTabMutationSnapshot;

  function errorMessageOf(err) {
    return String(err && err.message ? err.message : err);
  }

  function noopUnsubscribe() {}

  function notifyPadExhausted(_KDB) {
    try {
      const labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de ? _KDB.config.labels.de.widgetBase : null;
      const message = (labels && labels.maxWidgetsPerTab) || _config.LABELS_DE.maxWidgetsPerTab;
      const service = _KDB && _KDB.services && _KDB.services.message;
      if (!service || typeof service.notify !== "function") {
        console.warn("[widgetBase.subscribeDropValidated] message service unavailable");
        return;
      }
      service.notify({ message: message, severity: "warning" });
    } catch (err) {
      console.warn("[widgetBase.subscribeDropValidated] notifyPadExhausted failed", err);
    }
  }

  function startDropCreate(_KDB, dispatchFn, payload) {
    try {
      Promise.resolve(dispatchFn({
        type: TYPES.DROP_CREATE,
        payload: { dropRequest: payload || {}, isHistoryReplay: false }
      })).then(function (result) {
        if (result && result.ok !== true && result.isEligibleListEmpty === true) {
          notifyPadExhausted(_KDB);
        }
      }).catch(function (err) {
        console.warn("[widgetBase.subscribeDropValidated] dropCreate failed", err);
      });
    } catch (err) {
      console.error("[widgetBase.subscribeDropValidated] subscriber boundary failed", err);
      dispatchFn({
        type: TYPES.REPORT_ERROR,
        payload: { errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: errorMessageOf(err), operation: "dropValidated" }
      });
    }
  }

  function subscribeDropValidated(_KDB, dispatchFn) {
    const events = _KDB ? _KDB.events : null;
    if (!events || typeof events.subscribe !== "function") {
      return noopUnsubscribe;
    }
    return events.subscribe(DROP_VALIDATED_EVENT, function (payload) {
      startDropCreate(_KDB, dispatchFn, payload);
    });
  }

  // Fire-and-forget: routing failures are logged and never thrown back into the event bus;
  // a failed ensure stays retryable on the next activation.
  function dispatchEnsureRouted(dispatchFn, tabId) {
    try {
      Promise.resolve(dispatchFn({
        type: TYPES.ENSURE_TAB_WIDGETS_ROUTED,
        payload: { tabId: tabId, reason: "tabActivated" }
      })).then(function (result) {
        if (!result || result.ok !== true) {
          console.warn("[widgetBase.subscribeTabsChanged] ensureTabWidgetsRouted did not succeed", tabId, result);
        }
      }).catch(function (err) {
        console.warn("[widgetBase.subscribeTabsChanged] ensureTabWidgetsRouted failed", tabId, err);
      });
    } catch (err) {
      console.warn("[widgetBase.subscribeTabsChanged] subscriber boundary failed", tabId, err);
    }
  }

  // Lazily loaded tabs get their pre-existing canvas widgets routed on first activation
  // (contracts/widgetBase-lazyLaunchpadRouting-contractdelta.md §4). Every activation dispatches: routedTabIds makes
  // routed tabs a cheap no-op, and only this keeps a failed or raced first ensure retryable (contract delta §3.5).
  function subscribeTabsChanged(_KDB, dispatchFn) {
    const events = _KDB ? _KDB.events : null;
    if (!events || typeof events.subscribe !== "function") {
      return noopUnsubscribe;
    }
    return events.subscribe(_tabsEventNames.CHANGED, function (payload) {
      if (_runtimeKit.readTabsBusy(_KDB) || !payload || !payload.tabId) {
        return;
      }
      dispatchEnsureRouted(dispatchFn, payload.tabId);
    });
  }

  function readActiveTabId(_KDB) {
    const tabsApi = _KDB.api ? _KDB.api.tabs : null;
    const tabsState = tabsApi && typeof tabsApi.getState === "function" ? tabsApi.getState() : null;
    if (!tabsState) {
      return null;
    }
    if (tabsState.activeTabId) {
      return tabsState.activeTabId;
    }
    const activeTab = tabsState.byIndex ? tabsState.byIndex[String(tabsState.activeIndex)] : null;
    return activeTab && activeTab.tabId ? activeTab.tabId : null;
  }

  // Seeds the startup tab into routedTabIds so the lazy-routing path no-ops for the tab the mount-time
  // routeAllToLaunchpad already covered. Skipping the seed is harmless: the ensure path is idempotent.
  function seedRoutedStartupTab(_KDB) {
    try {
      const activeTabId = readActiveTabId(_KDB);
      if (!activeTabId) {
        return;
      }
      _runtime.ensureWidgetBaseRuntime(_KDB);
      _KDB.runtime.widgetBase.routedTabIds[activeTabId] = true;
    } catch (err) {
      console.warn("[widgetBase.mount] could not seed startup tab as routed", err);
    }
  }

  async function routeAllAfterLaunchpadReady(_KDB, dispatchFn, dispatchInternalFn, options) {
    const timeoutMs = typeof options.launchpadReadyTimeoutMs === "number" ? options.launchpadReadyTimeoutMs : 5000;
    const launchpad = _KDB.api && _KDB.api.launchpad;
    try {
      const isReady = launchpad && typeof launchpad.dispatch === "function"
        ? await launchpad.dispatch({ type: "launchpad/waitUntilReady", payload: { timeoutMs: timeoutMs } })
        : false;
      if (isReady !== true) {
        console.error("[widgetBase.mount] launchpad waitUntilReady returned false");
        dispatchInternalFn({
          type: TYPES.ERROR_RECORDED,
          payload: { errorCode: "WIDGET_BASE_LAUNCHPAD_NOT_READY", errorMessage: "Launchpad was not ready before routeAllToLaunchpad." }
        });
        return false;
      }
      const result = await dispatchFn({ type: TYPES.ROUTE_ALL_TO_LAUNCHPAD, payload: { reason: "startup", tabId: null } });
      if (!result || result.ok !== true) {
        console.warn("[widgetBase.mount] routeAllToLaunchpad completed without success", result);
        dispatchInternalFn({
          type: TYPES.ERROR_RECORDED,
          payload: { errorCode: result && result.errorCode ? result.errorCode : "WIDGET_BASE_MOUNT_FAILED", errorMessage: "Startup routeAllToLaunchpad did not succeed." }
        });
        return false;
      }
      seedRoutedStartupTab(_KDB);
      return true;
    } catch (err) {
      console.error("[widgetBase.mount] routeAllToLaunchpad failed", err);
      dispatchInternalFn({ type: TYPES.ERROR_RECORDED, payload: { errorCode: "WIDGET_BASE_MOUNT_FAILED", errorMessage: errorMessageOf(err) } });
      return false;
    }
  }

  function destroyWidgetBaseModule(_KDB) {
    try {
      const runtime = _KDB.runtime && _KDB.runtime.widgetBase ? _KDB.runtime.widgetBase : null;
      if (!runtime) {
        return;
      }
      _runtimeKit.disposeRuntimeBuckets(runtime).forEach(function (err) {
        console.error("[widgetBase.destroyWidgetBaseModule] release failed", err);
      });
      Object.keys(runtime.byId || {}).forEach(function (widgetId) {
        _canvas.cleanupWidgetRuntime(_KDB, widgetId);
      });
      runtime.byId = {};
      runtime.routedTabIds = {};
      runtime.pendingRouteByTabId = {};
      _tabMutationOwner.resetOnDestroy(_KDB);
      runtime.historyReplayHandlerContribution = null;
    } catch (err) {
      console.error("[widgetBase.destroyWidgetBaseModule] destroy boundary failed", err);
    }
  }

  function createWidgetBaseController(deps) {
    const _KDB = deps._KDB;
    const instanceOptions = deps.options || {};
    const guard = _errors.createDisposedGuard("widgetBase");
    const reducer = _state.createWidgetBaseReducer();

    function dispatchInternal(action) {
      _KDB.state.widgets.base = reducer(_KDB.state.widgets.base, action);
    }

    function ensureOpSeq(widgetId, requestedOpSeq) {
      _runtime.ensureWidgetBaseWidgetRuntime(_KDB, widgetId);
      const widgetRuntime = _KDB.runtime.widgetBase.byId[widgetId];
      if (typeof requestedOpSeq === "number") {
        widgetRuntime.opSeq = requestedOpSeq;
        return requestedOpSeq;
      }
      widgetRuntime.opSeq = (widgetRuntime.opSeq || 0) + 1;
      return widgetRuntime.opSeq;
    }

    function isStaleOpSeq(widgetId, opSeq) {
      const widgetRuntime = _KDB.runtime.widgetBase.byId[widgetId];
      return !widgetRuntime || widgetRuntime.opSeq !== opSeq;
    }

    function buildContext() {
      return {
        _KDB: _KDB,
        selectors: deps.selectors || _selectors,
        actionTypes: TYPES,
        widgetsFacet: deps.widgetsFacet || null,
        canvasFacet: deps.canvasFacet || null,
        dispatch: dispatch,
        dispatchInternal: dispatchInternal,
        ensureOpSeq: ensureOpSeq,
        isStaleOpSeq: isStaleOpSeq,
        isLaunchpadReady: function () { return _launchpadSelectors.readLaunchpadReady(_KDB) === true; }
      };
    }

    function dispatch(_action) {
      if (guard.blocked("dispatch")) {
        return Promise.resolve(normalizeDispatchResult({ ok: false, outcome: "aborted", reason: "disposed", errorCode: "WIDGET_BASE_DESTROY_FAILED" }));
      }
      const action = _action || {};
      if (action.widgetId && action.payload && action.payload.widgetId && action.widgetId !== action.payload.widgetId) {
        return Promise.resolve(normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_CONFLICT" }));
      }
      if (action.type === TYPES.REPORT_ERROR) {
        dispatchInternal({ type: TYPES.ERROR_RECORDED, widgetId: action.widgetId, payload: action.payload || {} });
        return Promise.resolve(normalizeDispatchResult({ ok: true }));
      }
      const handler = ROUTES[action.type];
      if (!handler) {
        return Promise.resolve(normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Unknown widgetBase action." }));
      }
      return handler(buildContext(), action);
    }

    function replaceSubscription(subscriptions, key, subscribe) {
      if (typeof subscriptions[key] === "function") {
        subscriptions[key]();
        delete subscriptions[key];
      }
      subscriptions[key] = subscribe(_KDB, dispatch);
    }

    function mount(_options) {
      if (guard.blocked("mount")) {
        return Promise.resolve(false);
      }
      try {
        dispatchInternal({ type: TYPES.MOUNT_STARTED });
        _KDB.state.widgets = _KDB.state.widgets || {};
        if (!_KDB.state.widgets.base) {
          _KDB.state.widgets.base = _state.createInitialWidgetBaseState();
        }
        _runtime.ensureWidgetBaseRuntime(_KDB);
        const subscriptions = _KDB.runtime.widgetBase.subscriptions;
        replaceSubscription(subscriptions, "dropValidated", subscribeDropValidated);
        replaceSubscription(subscriptions, "tabsChanged", subscribeTabsChanged);
        dispatchInternal({ type: TYPES.MOUNT_SUCCEEDED });
        const options = Object.assign({}, instanceOptions, _options || {});
        if (options.autoRouteAll === false) {
          return Promise.resolve(true);
        }
        return routeAllAfterLaunchpadReady(_KDB, dispatch, dispatchInternal, options);
      } catch (err) {
        console.error("[widgetBase.mount] mount boundary failed", err);
        dispatchInternal({ type: TYPES.ERROR_RECORDED, payload: { errorCode: "WIDGET_BASE_MOUNT_FAILED", errorMessage: errorMessageOf(err) } });
        return Promise.resolve(false);
      }
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        destroyWidgetBaseModule(_KDB);
        dispatchInternal({ type: TYPES.DESTROY });
      } catch (err) {
        console.error("[widgetBase.destroy] destroy boundary failed", err);
      }
    }

    function getState() {
      if (guard.isDisposed()) {
        return undefined;
      }
      try {
        return _data.cloneJson(_KDB.state.widgets.base);
      } catch (err) {
        console.error("[widgetBase.getState] state clone failed", err);
        return undefined;
      }
    }

    _runtime.ensureWidgetBaseRuntime(_KDB);
    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function seedWidgetBaseLabels(_KDB) {
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    const existing = _KDB.config.labels.de.widgetBase;
    _KDB.config.labels.de.widgetBase = Object.assign({}, _config.LABELS_DE, existing && typeof existing === "object" ? existing : {});
  }

  function stampHostFacets(_KDB) {
    const host = _KDB.services ? _KDB.services.cognosHost : null;
    _KDB.runtime.widgetBase.widgetsFacet = host && host.widgets ? host.widgets : null;
    _KDB.runtime.widgetBase.canvasFacet = host && host.canvas ? host.canvas : null;
  }

  function registerWidgetBase(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
    seedWidgetBaseLabels(_KDB);
    if (!_KDB.state.widgets.base) {
      _KDB.state.widgets.base = _state.createInitialWidgetBaseState();
    }
    _runtime.ensureWidgetBaseRuntime(_KDB);
    _KDB.runtime.widgetBase.historyReplayHandlerContribution = _history.createWidgetBaseHistoryReplayHandler(_KDB);
    stampHostFacets(_KDB);
    const controller = createWidgetBaseController({
      _KDB: _KDB,
      options: _options || {},
      selectors: _selectors,
      widgetsFacet: _KDB.runtime.widgetBase.widgetsFacet,
      canvasFacet: _KDB.runtime.widgetBase.canvasFacet
    });
    _KDB.api.widgetBase = controller;
    return controller;
  }

  return registerWidgetBase;
});
