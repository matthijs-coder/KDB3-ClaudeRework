define([
  "../context.js",
  "../selectors.js",
  "../state.js",
  "../effects/resolveWaveTabFromScope.js",
  "../effects/listTopNWaveWidgets.js",
  "../effects/runTopNWaveFanOut.js",
  "../../../tabs/events/eventNames.js",
  "../runtime.js"
], function (
  _visContext,
  _selectors,
  _state,
  _resolveWaveTabFromScope,
  _listTopNWaveWidgets,
  _runTopNWaveFanOut,
  _eventNames,
  _visRuntime
) {
  "use strict";

  function __controller(_KDB, _payload) {
    var payload = _payload || {};
    ensureTabSubscription(_KDB);
    if (payload.filterType === "dienststelle" || payload.filterType === "sicht") {
      return Promise.resolve({ ok: true, skipped: true });
    }
    if (payload.scopeType === "pageContext" && !payload.tabId) {
      return _resolveWaveTabFromScope(_KDB, payload.scopeId).then(continueWithTab.bind(null, _KDB, payload));
    }
    return runResolved(_KDB, payload);
  }

  function continueWithTab(_KDB, _payload, _tabId) {
    if (!_tabId) {
      return { ok: true, skipped: true };
    }
    return runResolved(_KDB, Object.assign({}, _payload, { tabId: _tabId }));
  }

  function runResolved(_KDB, _payload) {
    var activeTabId = _KDB.state && _KDB.state.tabs ? (_KDB.state.tabs.activeTabId || _KDB.state.tabs.currentTabId) : null;
    var context = buildWaveContext(_KDB);
    var listed;
    if (_payload.scopeType === "pageContext" && activeTabId && _payload.tabId !== activeTabId) {
      rememberTab(_KDB, _payload.tabId, _payload);
      return Promise.resolve({ ok: true, deferred: true });
    }
    listed = _listTopNWaveWidgets(_KDB, context.readSettingsSnapshot, _payload.scopeType, _payload.tabId);
    rememberHidden(_KDB, listed.hiddenTabIds, _payload);
    if (!listed.widgetIds.length) {
      return Promise.resolve({ ok: true, skipped: true });
    }
    return _runTopNWaveFanOut(_KDB, context, listed.widgetIds, _payload);
  }

  function rememberHidden(_KDB, _tabIds, _payload) {
    var index = 0;
    while (index < _tabIds.length) {
      rememberTab(_KDB, _tabIds[index], _payload);
      index += 1;
    }
  }

  function rememberTab(_KDB, _tabId, _payload) {
    var runtime = _visRuntime.initializeRuntime(_KDB);
    runtime.pendingTopNWavesByTab = runtime.pendingTopNWavesByTab || {};
    runtime.pendingTopNWavesByTab[_tabId] = {
      scopeType: "pageContext",
      tabId: _tabId,
      isJahr: _payload.isJahr === true,
      filterType: _payload.filterType,
      selectedYearKnown: _payload.scopeType === "pageContext" && _payload.selectedYearKnown === true,
      selectedYear: _payload.scopeType === "pageContext" && _payload.selectedYear != null ? _payload.selectedYear : null
    };
  }

  function ensureTabSubscription(_KDB) {
    var runtime = _visRuntime.initializeRuntime(_KDB);
    runtime.subscriptions = runtime.subscriptions || {};
    if (runtime.subscriptions.topNFilterWave || !_KDB.events || typeof _KDB.events.subscribe !== "function") {
      return;
    }
    runtime.subscriptions.topNFilterWave = _KDB.events.subscribe(_eventNames.CHANGED, onTabShown.bind(null, _KDB));
  }

  function onTabShown(_KDB, _event) {
    var tabId = _event && _event.tabId;
    var runtime = _visRuntime.initializeRuntime(_KDB);
    var stored;
    if (!tabId || !runtime.pendingTopNWavesByTab) { return; }
    stored = runtime.pendingTopNWavesByTab[tabId];
    if (!stored) { return; }
    delete runtime.pendingTopNWavesByTab[tabId];
    Promise.resolve(__controller(_KDB, stored)).then(null, logDeferred);
  }

  function logDeferred(_err) {
    console.error("[widgetVis.runTopNFilterConfirmWave] deferred wave failed", _err);
  }

  function buildWaveContext(_KDB) {
    var instance;
    _visContext.ensureVisState(_KDB);
    instance = { _KDB: _KDB, selectors: _selectors, reducer: _state.createWidgetVisReducer(), isDisposed: isNotDisposed };
    instance.dispatchInternal = dispatchWave.bind(null, instance);
    return _visContext.buildContext(instance);
  }

  function isNotDisposed() { return false; }

  function dispatchWave(_instance, _action) {
    _visContext.dispatchInternal(_instance, _action);
  }

  return __controller;
});
