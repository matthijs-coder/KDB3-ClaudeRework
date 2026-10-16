define([
  "../state.js",
  "../config.js",
  "../history.js",
  "../view/syncView.js",
  "../view/dockNames.js",
  "../../../../core/utils/kit/runtime.js",
  "../../_core/dockHandoff.js",
  "./sichtSync.js",
  "./historyReplay.js",
  "./reconcile/runReconcile.js"
], function (
  _state,
  _config,
  _history,
  _syncView,
  _dockNames,
  _kitRuntime,
  _dockHandoff,
  _sichtSync,
  _historyReplay,
  _runReconcile
) {
  "use strict";

  var HANDOFF_PROFILE = {
    filterType: "dienststelle",
    labelDefault: "Dienststelle",
    scopeMode: "filterScopeFirst",
    keyScope: "filterScope",
    timestamp: "observedAtNullable",
    fields: [
      ["filterId", "orNull"],
      ["filterLabel", "derived"],
      ["filterKey", "derived"],
      ["filterScope", "derived"],
      ["scopeType", "derived"],
      ["filterType", "filterType"],
      ["scopeId", "scopeIdPair"],
      ["scope", "scopePair"],
      ["filterConfig", "copyOrEmpty"],
      ["interactionType", "derived"],
      ["isAlleOption", "isTrue"],
      ["optionLabel", "optionLabel"],
      ["popup", "copyOrNull"],
      ["capabilities", "derived"],
      ["clickedOk", "derived"],
      ["clickedCancel", "derived"],
      ["clickedClear", "derived"],
      ["clickedClose", "derived"],
      ["resyncSource", "orNull"],
      ["timestamp", "derived"]
    ]
  };

  function mapFilterDockHandoff(_handoff) {
    return _dockHandoff.mapDockHandoff(_handoff, HANDOFF_PROFILE);
  }

  function readDienststelleRuntime(_KDB) {
    return _kitRuntime.ensureRuntime(_KDB, "dienststelle", _config.createRuntimeDefaults());
  }

  function rememberFilterDockIntent(_KDB, _mappedHandoff) {
    var runtime = readDienststelleRuntime(_KDB);
    var handoff = _mappedHandoff || {};
    if (handoff.clickedClear === true || handoff.interactionType === "clear") {
      runtime.lastPendingIntent = "clear";
      runtime.lastPendingIntentScope = handoff.filterScope;
      runtime.lastPendingIntentScopeId = handoff.scopeId || handoff.scope || null;
      return;
    }
    if (handoff.interactionType === "cancel" || handoff.interactionType === "close") {
      runtime.lastPendingIntent = null;
      runtime.lastPendingIntentScope = null;
      runtime.lastPendingIntentScopeId = null;
    }
  }

  function readCommitSourceWasClear(_KDB, _mappedHandoff) {
    var runtime = readDienststelleRuntime(_KDB);
    var handoff = _mappedHandoff || {};
    var wasPendingClear = runtime.lastPendingIntent === "clear";
    if (handoff.clickedOk === true) {
      runtime.lastPendingIntent = "confirm";
    }
    return wasPendingClear || handoff.clickedClear === true || handoff.interactionType === "clear";
  }

  function matchVariantKey(_value) {
    var key = _value != null ? String(_value) : "";
    var idx;
    if (_config.FILTER_KEYS.indexOf(key) !== -1) {
      return key;
    }
    for (idx = 0; idx < _config.FILTER_KEYS.length; idx += 1) {
      if (key.indexOf(_config.FILTER_KEYS[idx]) !== -1) {
        return _config.FILTER_KEYS[idx];
      }
    }
    return null;
  }

  function readVariantKeyFromHandoff(_mappedHandoff) {
    var candidates;
    var idx;
    var matched;
    if (!_mappedHandoff) {
      return null;
    }
    candidates = [_mappedHandoff.filterLabel, _mappedHandoff.filterKey,
      _mappedHandoff.filterName, _mappedHandoff.activeFilterKey];
    for (idx = 0; idx < candidates.length; idx += 1) {
      matched = matchVariantKey(candidates[idx]);
      if (matched) {
        return matched;
      }
    }
    return null;
  }

  function isInactiveVariantHandoff(_KDB, _mappedHandoff) {
    var state = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
    var activeKey = state && state.activeFilterKey ? String(state.activeFilterKey) : "";
    var handoffVariantKey;
    var variantState;
    if (!activeKey || !_mappedHandoff) {
      return false;
    }
    handoffVariantKey = readVariantKeyFromHandoff(_mappedHandoff);
    if (!handoffVariantKey) {
      return false;
    }
    if (handoffVariantKey !== activeKey) {
      return true;
    }
    variantState = state.byFilter ? state.byFilter[handoffVariantKey] : null;
    return !!(variantState && variantState.status === "inactive");
  }

  function afterUserConfirmReconcile(_controller, _oldSnapshot, _reconcileResult) {
    return _history.pushDienststelleHistoryStep(_controller._KDB, _oldSnapshot, _reconcileResult);
  }

  function runUserConfirmReconcile(_controller, _dispatchInternal, _reconcile, _mappedHandoff) {
    var oldSnapshot = _historyReplay.readConfirmHistorySnapshot(_controller._KDB);
    return _runReconcile.runReconcile(_controller._KDB, _dispatchInternal, _reconcile, {
      source: "user",
      commitFromUser: true,
      allowDefaulting: true,
      filterScope: _mappedHandoff.filterScope,
      scopeId: _mappedHandoff.scopeId || _mappedHandoff.scope,
      commitSourceScope: _mappedHandoff.filterScope === "pageContext" ? "pageContext" : "global",
      commitSourceWasClear: readCommitSourceWasClear(_controller._KDB, _mappedHandoff),
      viewSyncHandoff: _mappedHandoff || null,
      observedAt:
        _mappedHandoff && _mappedHandoff.timestamp != null ? _mappedHandoff.timestamp : Date.now()
    }).then(afterUserConfirmReconcile.bind(null, _controller, oldSnapshot));
  }

  function routeDienststelleDispatch(_controller, _dispatchInternal, _reconcile, _action) {
    var action = _action || {};
    var actions = _state.ACTIONS;
    var mappedHandoff;
    if (action.type === actions.FILTER_DOCK_STATE_CHANGED) {
      mappedHandoff = mapFilterDockHandoff(action.payload);
      if (!mappedHandoff || isInactiveVariantHandoff(_controller._KDB, mappedHandoff)) {
        return Promise.resolve(undefined);
      }
      _dispatchInternal({
        type: actions.FILTER_DOCK_STATE_CHANGED,
        payload: mappedHandoff
      });
      rememberFilterDockIntent(_controller._KDB, mappedHandoff);
      if (!mappedHandoff.clickedOk) {
        return Promise.resolve(undefined);
      }
      return runUserConfirmReconcile(_controller, _dispatchInternal, _reconcile, mappedHandoff);
    }
    if (action.type === actions.FILTER_DOCK_POPUP_READY) {
      mappedHandoff = mapFilterDockHandoff(action.payload);
      if (!mappedHandoff || isInactiveVariantHandoff(_controller._KDB, mappedHandoff)) {
        return Promise.resolve(undefined);
      }
      _dispatchInternal({
        type: actions.FILTER_DOCK_POPUP_READY,
        payload: mappedHandoff
      });
      _dockNames.syncFilterDockNames(_controller._KDB);
      _syncView.syncViewFromState(_controller._KDB, mappedHandoff);
      return Promise.resolve(undefined);
    }
    if (action.type === actions.FILTER_DOCK_FILTERS_READY) {
      _dockNames.syncFilterDockNames(_controller._KDB);
      return Promise.resolve(undefined);
    }
    if (action.type === actions.FILTER_DOCK_HEADER_OBSERVED) {
      _dockNames.syncFilterDockNames(_controller._KDB);
      return Promise.resolve(undefined);
    }
    if (action.type === actions.FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED) {
      _syncView.syncViewFromState(_controller._KDB, null);
      return Promise.resolve(undefined);
    }
    if (action.type === actions.SICHT_CHANGED) {
      return _sichtSync.syncFromSicht(_controller._KDB, _dispatchInternal, action.payload);
    }
    if (action.type === actions.HISTORY_REPLAY_REQUESTED) {
      return _historyReplay.handleHistoryReplay(_controller, _dispatchInternal, action.payload);
    }
    if (action.type === actions.TABLE_DATA_CHANGED || action.type === actions.SYNC_REQUESTED) {
      // Defer reconcile while the tabs mutation saga is in flight.
      if (_kitRuntime.readTabsBusy(_controller._KDB, ["tabMutation"])) {
        return Promise.resolve(undefined);
      }
      return _runReconcile.runReconcile(
        _controller._KDB,
        _dispatchInternal,
        _reconcile,
        Object.assign({}, action.payload || {}, {
          source: (action.payload && action.payload.source)
            || (action.type === actions.TABLE_DATA_CHANGED ? "tableData" : "sync")
        })
      );
    }
    if (action.type === actions.ERROR) {
      _dispatchInternal(action);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(undefined);
  }

  return {
    routeDienststelleDispatch: routeDienststelleDispatch
  };
});
