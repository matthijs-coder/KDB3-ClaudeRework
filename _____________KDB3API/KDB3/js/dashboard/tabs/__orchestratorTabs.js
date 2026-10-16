define(["./createTabsController.js", "./state/createInitialTabsState.js", "./state/reduceTabsAction.js", "./state/selectors.js", "./adapters/createCognosTabsAdapter.js", "./effects/applyTabsEffects.js", "./config/selectors.js", "./history/createTabsHistoryReplayHandler.js", "./chrome.js"], function (_createTabsController, _createInitialTabsState, _reduceTabsAction, _stateSelectors, _createCognosTabsAdapter, _applyTabsEffects, _domSelectors, _createHandler, _chrome) {
  "use strict";

  // Lifecycle terms for tabs: idle, initializing, loading, ready, error, disposed.
  function __orchestrator(_KDB, _options) {
    try {
      ensureNamespaces(_KDB);
      registerDomSelectors(_KDB);
      initializeState(_KDB);
      const adapter = initializeRuntime(_KDB);
      stageTabsHistoryReplayHandler(_KDB);
      const controller = _createTabsController({ _KDB: _KDB, adapter: adapter, reduceTabsAction: _reduceTabsAction, selectors: _stateSelectors, applyTabsEffects: _applyTabsEffects, options: _options || {} });
      _KDB.api.tabs = controller;
      return controller;
    } catch (err) {
      console.error("[tabs.__orchestrator] orchestration failed", err);
      throw err;
    }
  }

  function ensureNamespaces(_KDB) {
    try {
      _KDB.state = _KDB.state || {};
      _KDB.runtime = _KDB.runtime || {};
      _KDB.api = _KDB.api || {};
      _KDB.elements = _KDB.elements || {};
      _KDB.elements.selectors = _KDB.elements.selectors || {};
    } catch (err) {
      console.error("[tabs.ensureNamespaces] namespace setup failed", err);
      throw err;
    }
  }

  function registerDomSelectors(_KDB) {
    try {
      _KDB.elements.selectors.tabs = Object.assign({}, _KDB.elements.selectors.tabs || {}, _domSelectors);
    } catch (err) {
      console.error("[tabs.registerDomSelectors] selector registration failed", err);
      throw err;
    }
  }

  function initializeState(_KDB) {
    try {
      _KDB.state.tabs = _KDB.state.tabs || _createInitialTabsState();
    } catch (err) {
      console.error("[tabs.initializeState] state initialization failed", err);
      throw err;
    }
  }

  function initializeRuntime(_KDB) {
    try {
      _KDB.runtime.tabs = _KDB.runtime.tabs || {};
      const runtime = _KDB.runtime.tabs;
      runtime.domRefs = runtime.domRefs || {};
      runtime.listeners = runtime.listeners || {};
      runtime.subscriptions = runtime.subscriptions || {};
      runtime.abortControllers = runtime.abortControllers || {};
      runtime.observers = runtime.observers || {};
      runtime.timers = runtime.timers || {};
      runtime.pendingPromises = runtime.pendingPromises || {};
      runtime.adapters = runtime.adapters || {};
      runtime.lastTabMutationError = null;
      runtime.historyReplayHandlerContribution = null;
      stampHostFacets(_KDB, runtime);
      bindReadCurrentTab(_KDB, runtime);
      runtime.adapters.cognos = _createCognosTabsAdapter({ tabsFacet: runtime.tabsFacet });
      runtime.editSession = null;
      return runtime.adapters.cognos;
    } catch (err) {
      console.error("[tabs.initializeRuntime] runtime initialization failed", err);
      throw err;
    }
  }

  function stampHostFacets(_KDB, runtime) {
    const service = _KDB.services && _KDB.services.cognosHost ? _KDB.services.cognosHost : null;
    runtime.tabsFacet = service && service.tabs ? service.tabs : null;
    runtime.canvasFacet = service && service.canvas ? service.canvas : null;
  }

  function bindReadCurrentTab(_KDB, runtime) {
    try {
      const utils = _KDB && _KDB.utils;
      if (!utils || typeof utils.readCurrentTab !== "function") {
        return;
      }
      if (!runtime.readCurrentTabUnbound) {
        runtime.readCurrentTabUnbound = utils.readCurrentTab;
      }
      const helper = runtime.readCurrentTabUnbound;
      const chromeReaders = { readSelectedTabIndex: _chrome.readSelectedTabIndexFromChrome };
      utils.readCurrentTab = function boundReadCurrentTab(_root) {
        return helper({
          tabsFacet: runtime.tabsFacet,
          chromeReaders: chromeReaders
        }, _root);
      };
    } catch (err) {
      console.error("[tabs.bindReadCurrentTab] failed", err);
      throw err;
    }
  }

  function stageTabsHistoryReplayHandler(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.tabs = _KDB.runtime.tabs || {};
      var handler = _createHandler(_KDB);
      _KDB.runtime.tabs.historyReplayHandlerContribution = handler;
      return handler;
    } catch (err) {
      console.error("[tabs.stageTabsHistoryReplayHandler] failed", err);
      return null;
    }
  }

  return __orchestrator;
});
