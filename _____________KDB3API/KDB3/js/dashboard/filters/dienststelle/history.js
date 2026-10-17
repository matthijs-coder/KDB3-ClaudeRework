define([
  "./state.js",
  "./selectors.js",
  "../../../core/utils/kit/history.js"
], function (_state, _selectors, _kitHistory) {
  "use strict";

  var HISTORY_KEY = "filter_dienststelle";

  function buildCommittedStep(_oldSnapshot, _newSnapshot, _timestamp) {
    return {
      key: HISTORY_KEY,
      timestamp: _timestamp != null ? _timestamp : Date.now(),
      old: _oldSnapshot ? Object.assign({}, _oldSnapshot) : null,
      new: _newSnapshot ? Object.assign({}, _newSnapshot) : null
    };
  }

  // The history service rejects steps whose old and new snapshots are equal.
  function pushDienststelleHistoryStep(_KDB, _oldSnapshot, _reconcileResult) {
    var newSnapshot;
    if (!_reconcileResult) {
      return _reconcileResult;
    }
    newSnapshot = _selectors.readDienststelleSnapshot(_KDB);
    if (_oldSnapshot && newSnapshot) {
      _kitHistory.pushHistoryStep(_KDB, buildCommittedStep(_oldSnapshot, newSnapshot, Date.now()));
    }
    return _reconcileResult;
  }

  async function applyReplay(_KDB, _targetValue, _step, _ctx) {
    var api = _KDB && _KDB.api ? _KDB.api.dienststelle : null;
    var replayResult;
    if (!api) {
      return false;
    }
    replayResult = await api.dispatch({
      type: _state.ACTIONS.HISTORY_REPLAY_REQUESTED,
      payload: {
        targetValue: _targetValue,
        step: _step || {},
        ctx: _ctx
      }
    });
    return replayResult === true;
  }

  function copyPageContextValues(_pageContext) {
    var out = {};
    if (!_pageContext || typeof _pageContext !== "object") {
      return out;
    }
    Object.keys(_pageContext).forEach(function (scopeId) {
      out[scopeId] = _state.copyValueEntries(_pageContext[scopeId]);
    });
    return out;
  }

  function valuesByScopeFromByFilter(_filterState) {
    var pageContext = {};
    var scopes;
    if (!_filterState || !_filterState.currentSelectionByScope) {
      return { global: [], pageContext: pageContext };
    }
    scopes = _filterState.currentSelectionByScope.pageContext || {};
    Object.keys(scopes).forEach(function (scopeId) {
      pageContext[scopeId] = _state.copyValueEntries(scopes[scopeId].currentValues);
    });
    return {
      global: _state.copyValueEntries(_filterState.currentSelectionByScope.global.currentValues),
      pageContext: pageContext
    };
  }

  // Accepts a stored step snapshot (valuesByScope) and the full-state shape from api.dienststelle.getState().
  function normalizeReplayTargetSnapshot(_target) {
    if (!_target || typeof _target !== "object") {
      return null;
    }
    if (_target.valuesByScope) {
      return {
        activeSichtValue: _target.activeSichtValue,
        activeFilterKey: _target.activeFilterKey,
        visibleFilterLabel: _target.visibleFilterLabel,
        valuesByScope: {
          global: _state.copyValueEntries(_target.valuesByScope.global),
          pageContext: copyPageContextValues(_target.valuesByScope.pageContext)
        }
      };
    }
    if (_target.byFilter && _target.activeFilterKey) {
      return {
        activeSichtValue: _target.activeSichtValue,
        activeFilterKey: _target.activeFilterKey,
        visibleFilterLabel: _target.visibleFilterLabel,
        valuesByScope: valuesByScopeFromByFilter(_target.byFilter[_target.activeFilterKey])
      };
    }
    return null;
  }

  function readDominantStoredSelection(_valuesByScope) {
    var globalValues;
    var pageContext;
    var scopeIds;
    if (!_valuesByScope) {
      return null;
    }
    globalValues = _valuesByScope.global;
    if (Array.isArray(globalValues) && globalValues.length) {
      return globalValues[0];
    }
    pageContext = _valuesByScope.pageContext || {};
    scopeIds = Object.keys(pageContext);
    if (scopeIds.length && Array.isArray(pageContext[scopeIds[0]]) && pageContext[scopeIds[0]].length) {
      return pageContext[scopeIds[0]][0];
    }
    return null;
  }

  return {
    buildCommittedStep: buildCommittedStep,
    pushDienststelleHistoryStep: pushDienststelleHistoryStep,
    applyReplay: applyReplay,
    normalizeReplayTargetSnapshot: normalizeReplayTargetSnapshot,
    readDominantStoredSelection: readDominantStoredSelection
  };
});
