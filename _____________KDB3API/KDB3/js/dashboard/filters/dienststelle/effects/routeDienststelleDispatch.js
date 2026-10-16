define([
  "../config/actions.js", "./mapFilterDockHandoff.js", "./syncDienststelleFromSicht.js",
  "./runDienststelleReconcile.js", "./handleDienststelleHistoryReplay.js",
  "./readDienststelleConfirmHistorySnapshot.js", "../history/pushDienststelleHistoryStep.js",
  "../view/syncDienststelleViewFromState.js", "../view/syncDienststelleFilterDockNames.js",
  "./rememberDienststelleFilterDockIntent.js"
], function (_actions, _mapHandoff, _syncFromSicht, _runReconcile, _handleHistoryReplay,
  _readConfirmHistorySnapshot, _pushHistoryStep, _syncView, _syncFilterDockNames, _rememberIntent) {
  "use strict";

  var VARIANT_FILTER_KEYS = { Dienststelle_BW: true, Dienststelle_DEZPV: true };

  function matchVariantKey(_value) {
    var key = _value != null ? String(_value) : "";
    if (VARIANT_FILTER_KEYS[key]) {
      return key;
    }
    if (key.indexOf("Dienststelle_BW") !== -1) {
      return "Dienststelle_BW";
    }
    if (key.indexOf("Dienststelle_DEZPV") !== -1) {
      return "Dienststelle_DEZPV";
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
    return _pushHistoryStep(_controller._KDB, _oldSnapshot, _reconcileResult);
  }

  function runUserConfirmReconcile(_controller, _dispatchInternal, _reconcile, _mappedHandoff) {
    var oldSnapshot = _readConfirmHistorySnapshot(_controller._KDB);
    return _runReconcile(_controller._KDB, _dispatchInternal, _reconcile, {
      source: "user",
      commitFromUser: true,
      allowDefaulting: true,
      filterScope: _mappedHandoff.filterScope,
      scopeId: _mappedHandoff.scopeId || _mappedHandoff.scope,
      commitSourceScope: _mappedHandoff.filterScope === "pageContext" ? "pageContext" : "global",
      commitSourceWasClear: _rememberIntent.readCommitSourceWasClear(_controller._KDB, _mappedHandoff),
      viewSyncHandoff: _mappedHandoff || null,
      observedAt:
        _mappedHandoff && _mappedHandoff.timestamp != null ? _mappedHandoff.timestamp : Date.now()
    }).then(afterUserConfirmReconcile.bind(null, _controller, oldSnapshot));
  }

  function routeDienststelleDispatch(_controller, _dispatchInternal, _reconcile, _action) {
    var action = _action || {};
    var mappedHandoff;
    if (action.type === _actions.FILTER_DOCK_STATE_CHANGED) {
      mappedHandoff = _mapHandoff(action.payload);
      if (!mappedHandoff || isInactiveVariantHandoff(_controller._KDB, mappedHandoff)) {
        return Promise.resolve(undefined);
      }
      _dispatchInternal({
        type: _actions.FILTER_DOCK_STATE_CHANGED,
        payload: mappedHandoff
      });
      _rememberIntent.rememberFilterDockIntent(_controller._KDB, mappedHandoff);
      if (!mappedHandoff.clickedOk) {
        return Promise.resolve(undefined);
      }
      return runUserConfirmReconcile(_controller, _dispatchInternal, _reconcile, mappedHandoff);
    }
    if (action.type === _actions.FILTER_DOCK_POPUP_READY) {
      mappedHandoff = _mapHandoff(action.payload);
      if (!mappedHandoff || isInactiveVariantHandoff(_controller._KDB, mappedHandoff)) {
        return Promise.resolve(undefined);
      }
      _dispatchInternal({
        type: _actions.FILTER_DOCK_POPUP_READY,
        payload: mappedHandoff
      });
      _syncFilterDockNames(_controller._KDB);
      _syncView(_controller._KDB, mappedHandoff);
      return Promise.resolve(undefined);
    }
    if (action.type === _actions.FILTER_DOCK_FILTERS_READY) {
      _syncFilterDockNames(_controller._KDB);
      return Promise.resolve(undefined);
    }
    if (action.type === _actions.FILTER_DOCK_HEADER_OBSERVED) {
      _syncFilterDockNames(_controller._KDB);
      return Promise.resolve(undefined);
    }
    if (action.type === _actions.FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED) {
      _syncView(_controller._KDB, null);
      return Promise.resolve(undefined);
    }
    if (action.type === _actions.SICHT_CHANGED) {
      return _syncFromSicht(_controller._KDB, _dispatchInternal, action.payload);
    }
    if (action.type === _actions.HISTORY_REPLAY_REQUESTED) {
      return _handleHistoryReplay(_controller, _dispatchInternal, action.payload);
    }
    if (action.type === _actions.TABLE_DATA_CHANGED || action.type === _actions.SYNC_REQUESTED) {
      // Tab-mutation delta §3: defer reconcile while tabs mutation saga is in flight.
      if (_controller._KDB.runtime && _controller._KDB.runtime.tabs && _controller._KDB.runtime.tabs.pendingPromises && _controller._KDB.runtime.tabs.pendingPromises.tabMutation) { return Promise.resolve(undefined); }
      return _runReconcile(_controller._KDB, _dispatchInternal, _reconcile, Object.assign({}, action.payload || {}, {
        source: (action.payload && action.payload.source) || (action.type === _actions.TABLE_DATA_CHANGED ? "tableData" : "sync")
      }));
    }
    if (action.type === _actions.ERROR) {
      _dispatchInternal(action);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(undefined);
  }

  return routeDienststelleDispatch;
});
