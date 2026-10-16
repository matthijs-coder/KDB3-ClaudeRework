define([
  "./readDienststelleHostSelection.js",
  "./lookupDienststelleFilterRef.js",
  "./clearDienststelleFilterScope.js",
  "./resolveDienststelleReplayApplyOrder.js",
  "./waitForStableDienststelleScopeValues.js",
  "./dienststelleScopeApplySupport.js"
], function (_hostSelection, _hostLookup, _clearFilterScope, _resolveApplyOrder, _waitForStable, _support) {
  "use strict";

  function applyScopeValues(_KDB, _activeFilterKey, _scopeId, _values, _filtersFacet, _missingApiBlocker) {
    var filterRef;
    var cognosValues;
    if (!_values || !Array.isArray(_values) || !_values.length) {
      return _clearFilterScope(_KDB, _activeFilterKey, _scopeId, _filtersFacet).then(_support.mapClearResult);
    }
    filterRef =
      _scopeId === "global"
        ? _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
        : _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _scopeId);
    if (!filterRef) {
      return Promise.resolve({ ok: false, blocker: _missingApiBlocker });
    }
    cognosValues = _support.toCognosValues(_values);
    if (!cognosValues.length) {
      return _clearFilterScope(_KDB, _activeFilterKey, _scopeId, _filtersFacet).then(_support.mapClearResult);
    }
    return _filtersFacet.writeFilter({ ref: filterRef, values: cognosValues }).then(toWriteResult);
  }

  function toWriteResult(_outcome) {
    if (_outcome && _outcome.ok === true) {
      return { ok: true };
    }
    console.error(
      "[dienststelle.applyStoredDienststelleScopeValues] host write not applied",
      _outcome ? (_outcome.errorCode || _outcome.reason) : null
    );
    return { ok: false, blocker: "COGNOS_REPLACE_FILTER_CONTEXT_FAILED" };
  }

  function waitPhaseStability(_KDB, _activeFilterKey, _filtersFacet, _touchedScopes, _valuesByScope) {
    var chain = Promise.resolve();
    var idx;
    for (idx = 0; idx < _touchedScopes.length; idx += 1) {
      (function (currentScopeId) {
        var expected = _support.expectedForScope(currentScopeId, _valuesByScope);
        chain = chain.then(function () {
          return _waitForStable(_KDB, _activeFilterKey, currentScopeId, _filtersFacet, expected).then(
            function (waitResult) {
              if (!waitResult.stable && expected.mode === "empty") {
                console.warn(
                  "[dienststelle.applyStoredDienststelleScopeValues] stability wait timeout",
                  currentScopeId
                );
              }
              return waitResult;
            }
          );
        });
      })(_touchedScopes[idx]);
    }
    return chain;
  }

  function runPhase(_KDB, _activeFilterKey, _phase, _pageContext, _valuesByScope, _filtersFacet) {
    var touchedScopes = [];
    var scopeIds;
    var idx;
    var chain = Promise.resolve({ applied: true });
    if (_phase === "global") {
      touchedScopes.push("global");
      chain = applyScopeValues(
        _KDB,
        _activeFilterKey,
        "global",
        _valuesByScope.global,
        _filtersFacet,
        "COGNOS_GLOBAL_FILTER_API_UNAVAILABLE"
      ).then(_support.toAppliedResult);
    } else if (_phase === "pageContext") {
      scopeIds = Object.keys(_pageContext);
      touchedScopes = scopeIds.slice();
      for (idx = 0; idx < scopeIds.length; idx += 1) {
        (function (currentScopeId) {
          chain = chain.then(function (state) {
            if (!state.applied) {
              return state;
            }
            return applyScopeValues(
              _KDB,
              _activeFilterKey,
              currentScopeId,
              _pageContext[currentScopeId],
              _filtersFacet,
              "COGNOS_PAGE_CONTEXT_FILTER_API_UNAVAILABLE"
            ).then(_support.toAppliedResult);
          });
        })(scopeIds[idx]);
      }
    }
    return chain.then(function (state) {
      if (!state.applied) {
        return state;
      }
      return waitPhaseStability(_KDB, _activeFilterKey, _filtersFacet, touchedScopes, _valuesByScope).then(
        function () {
          return { applied: true };
        }
      );
    });
  }

  function applyStoredDienststelleScopeValues(_KDB, _snapshot) {
    var filtersFacet;
    var valuesByScope;
    var activeFilterKey;
    var pageContext;
    var order;
    var chain;
    var phaseIdx;
    if (!_snapshot || !_snapshot.activeFilterKey) {
      return Promise.resolve({ applied: false, blocker: "DIENSTSTELLE_REPLAY_SNAPSHOT_INVALID" });
    }
    filtersFacet = _hostLookup.readFiltersFacet(_KDB);
    if (!filtersFacet) {
      return Promise.resolve({ applied: false, blocker: "COGNOS_FILTER_API_UNAVAILABLE" });
    }
    activeFilterKey = _snapshot.activeFilterKey;
    valuesByScope = _snapshot.valuesByScope || {};
    pageContext = valuesByScope.pageContext || {};
    order = _resolveApplyOrder(valuesByScope);
    chain = Promise.resolve({ applied: true });
    for (phaseIdx = 0; phaseIdx < order.phases.length; phaseIdx += 1) {
      (function (phase) {
        chain = chain.then(function (state) {
          if (!state.applied) {
            return state;
          }
          return runPhase(_KDB, activeFilterKey, phase, pageContext, valuesByScope, filtersFacet);
        });
      })(order.phases[phaseIdx]);
    }
    return chain.then(function (state) {
      return state.applied ? { applied: true } : { applied: false, blocker: state.blocker };
    });
  }

  return applyStoredDienststelleScopeValues;
});
