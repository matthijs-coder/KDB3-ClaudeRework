define([
  "../binding/pipeline.js",
  "../context.js",
  "../runtime.js",
  "./gate.js",
  "./periodPin.js",
  "../../widgetBase/state/selectors.js",
  "../../../tabs/events/eventNames.js",
  "../../../tabs/selectors.js",
  "../../../../core/utils/normalizeDefaultValue.js"
], function (_pipeline, _visContext, _visRuntime, _topNGate, _periodPin, _baseSelectors, _tabsEvents, _tabsSelectors, _normalizeDefaultValue) {
  "use strict";

  function isWaveFrame(_frame) {
    return !!(_frame && _frame.placement === "onCanvas" && _frame.kind === "vis" && _frame.lifecycle !== "disposed" && _frame.widgetId);
  }

  function qualifies(_settings) {
    var settings = _settings || {};
    return _normalizeDefaultValue(settings.dimension) != null && _topNGate.isDefaultTopNChoice(settings.topNChoice) !== true;
  }

  function listTopNWaveWidgets(_KDB, _readSettings, _scopeType, _tabId) {
    var activeTabId;
    var widgetIds = [];
    var hiddenTabIds = [];
    if (_scopeType === "pageContext") {
      _baseSelectors.readCanvasWidgetsByTab(_KDB, _tabId).forEach(function (_frame) {
        if (isWaveFrame(_frame) && qualifies(_readSettings(_frame.widgetId))) {
          widgetIds.push(_frame.widgetId);
        }
      });
      return { widgetIds: widgetIds, hiddenTabIds: hiddenTabIds };
    }
    activeTabId = _tabsSelectors.readActiveTabId(_KDB);
    _baseSelectors.readAllWidgetIds(_KDB).forEach(function (_id) {
      var frame = _baseSelectors.readFrame(_KDB, _id);
      if (!isWaveFrame(frame) || !qualifies(_readSettings(frame.widgetId || _id))) {
        return;
      }
      if (activeTabId && frame.tabId && frame.tabId !== activeTabId) {
        if (hiddenTabIds.indexOf(frame.tabId) === -1) {
          hiddenTabIds.push(frame.tabId);
        }
      } else {
        widgetIds.push(frame.widgetId || _id);
      }
    });
    return { widgetIds: widgetIds, hiddenTabIds: hiddenTabIds };
  }

  async function resolveWaveTabFromScope(_KDB, _scopeId) {
    var scopeId = _scopeId == null ? "" : String(_scopeId).trim();
    var tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    var result;
    var match;
    if (!scopeId) {
      return null;
    }
    if (!tabsApi || typeof tabsApi.dispatch !== "function") {
      console.warn("[widgetVis.resolveWaveTabFromScope] tabs api missing", { scopeId: scopeId });
      return null;
    }
    try {
      result = await tabsApi.dispatch({ type: "tabs/resolveFilterScopeTargets", payload: { source: "topNFilterWave" } });
    } catch (err) {
      console.error("[widgetVis.resolveWaveTabFromScope] failed", { scopeId: scopeId }, err);
      return null;
    }
    if (!result || result.ok !== true) {
      console.warn("[widgetVis.resolveWaveTabFromScope] scope targets missing", { scopeId: scopeId });
      return null;
    }
    match = _tabsSelectors.readTabScopeMatch(_KDB, scopeId, result.tabTargets);
    if (!match || match.status !== "ok" || !match.tab || !match.tab.tabId) {
      console.warn("[widgetVis.resolveWaveTabFromScope] no unique tab", { scopeId: scopeId, status: match && match.status });
      return null;
    }
    return match.tab.tabId;
  }

  function beginWave(_KDB) {
    var pending = _visRuntime.initializeRuntime(_KDB).pendingPromises;
    pending.periodPinWave = (pending.periodPinWave || 0) + 1;
    return pending.periodPinWave;
  }

  function isCurrentWave(_KDB, _waveId) {
    return _visRuntime.initializeRuntime(_KDB).pendingPromises.periodPinWave === _waveId;
  }

  async function runWidgetBinding(_context, _widgetId, _pin, _payload) {
    try {
      await _pipeline.runBindingPipeline(_context, {
        widgetId: _widgetId,
        reason: "topN",
        metric: _context.readMetric(_widgetId),
        settings: _context.readSettingsSnapshot(_widgetId, _payload),
        payload: { source: "topNFilterWave", isHistoryReplay: false },
        periodPin: _pin
      });
    } catch (err) {
      console.error("[widgetVis.runTopNFilterConfirmWave] widget failed", { widgetId: _widgetId }, err);
    }
  }

  async function releaseTopNClaim(_KDB, _widgetId) {
    var api = _KDB.api && _KDB.api.widgetTopN;
    if (!api || typeof api.dispatch !== "function") {
      return;
    }
    try {
      await api.dispatch({
        type: "widgetTopN/cleanup",
        widgetId: _widgetId,
        payload: { ownerVisId: _widgetId, reason: "topNWaveRelease", clearHelperBinding: false, releaseClaim: true }
      });
    } catch (err) {
      console.error("[widgetVis.runTopNFilterConfirmWave] claim release failed", { widgetId: _widgetId }, err);
    }
  }

  async function runWaveFanOut(_KDB, _context, _widgetIds, _payload) {
    var waveId = beginWave(_KDB);
    var pin;
    var index;
    try {
      pin = await _periodPin.applyTopNJahrMismatchPin(_KDB, null, _payload || {});
    } catch (err) {
      console.error("[widgetVis.runTopNFilterConfirmWave] pin failed", err);
      return isCurrentWave(_KDB, waveId) ? { ok: false, errorCode: err && err.errorCode } : { ok: false, cancelled: true };
    }
    for (index = 0; index < _widgetIds.length; index += 1) {
      if (!isCurrentWave(_KDB, waveId)) {
        return { ok: false, cancelled: true };
      }
      await runWidgetBinding(_context, _widgetIds[index], pin, _payload);
      await releaseTopNClaim(_KDB, _widgetIds[index]);
    }
    return { ok: true };
  }

  function rememberTab(_KDB, _tabId, _payload) {
    var runtime = _visRuntime.initializeRuntime(_KDB);
    var isPage = _payload.scopeType === "pageContext";
    runtime.pendingTopNWavesByTab = runtime.pendingTopNWavesByTab || {};
    runtime.pendingTopNWavesByTab[_tabId] = {
      scopeType: "pageContext",
      tabId: _tabId,
      isJahr: _payload.isJahr === true,
      filterType: _payload.filterType,
      selectedYearKnown: isPage && _payload.selectedYearKnown === true,
      selectedYear: isPage && _payload.selectedYear != null ? _payload.selectedYear : null
    };
  }

  function runWaveForTab(_KDB, _payload) {
    var activeTabId = _tabsSelectors.readActiveTabId(_KDB);
    var context = _visContext.createDetachedContext(_KDB);
    var listed;
    if (_payload.scopeType === "pageContext" && activeTabId && _payload.tabId !== activeTabId) {
      rememberTab(_KDB, _payload.tabId, _payload);
      return Promise.resolve({ ok: true, deferred: true });
    }
    listed = listTopNWaveWidgets(_KDB, context.readSettingsSnapshot, _payload.scopeType, _payload.tabId);
    listed.hiddenTabIds.forEach(function (_tabId) {
      rememberTab(_KDB, _tabId, _payload);
    });
    if (!listed.widgetIds.length) {
      return Promise.resolve({ ok: true, skipped: true });
    }
    return runWaveFanOut(_KDB, context, listed.widgetIds, _payload);
  }

  function replayWaveOnTabShown(_KDB, _event) {
    var tabId = _event && _event.tabId;
    var pending = _visRuntime.initializeRuntime(_KDB).pendingTopNWavesByTab;
    var stored = tabId && pending ? pending[tabId] : null;
    if (!stored) {
      return;
    }
    delete pending[tabId];
    runTopNFilterConfirmWave(_KDB, stored).catch(function (_err) {
      console.error("[widgetVis.runTopNFilterConfirmWave] deferred wave failed", _err);
    });
  }

  function ensureTabSubscription(_KDB) {
    var subscriptions = _visRuntime.initializeRuntime(_KDB).subscriptions;
    if (subscriptions.topNFilterWave || !_KDB.events || typeof _KDB.events.subscribe !== "function") {
      return;
    }
    subscriptions.topNFilterWave = _KDB.events.subscribe(_tabsEvents.CHANGED, replayWaveOnTabShown.bind(null, _KDB));
  }

  async function runTopNFilterConfirmWave(_KDB, _payload) {
    var payload = _payload || {};
    var tabId;
    ensureTabSubscription(_KDB);
    if (payload.filterType === "dienststelle" || payload.filterType === "sicht") {
      return { ok: true, skipped: true };
    }
    if (payload.scopeType === "pageContext" && !payload.tabId) {
      tabId = await resolveWaveTabFromScope(_KDB, payload.scopeId);
      return tabId ? runWaveForTab(_KDB, Object.assign({}, payload, { tabId: tabId })) : { ok: true, skipped: true };
    }
    return runWaveForTab(_KDB, payload);
  }

  return {
    runTopNFilterConfirmWave: runTopNFilterConfirmWave,
    listTopNWaveWidgets: listTopNWaveWidgets
  };
});
