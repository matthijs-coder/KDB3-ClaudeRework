define([
  "./filterRef.js",
  "./selection.js",
  "./clear.js"
], function (_filterRef, _selection, _clear) {
  "use strict";

  function cognosDisplay(_entry) {
    var hostDisplay = _entry.hostDisplay != null ? String(_entry.hostDisplay) : "";
    if (hostDisplay !== "") {
      return hostDisplay;
    }
    return _entry.displayValue != null ? String(_entry.displayValue) : "";
  }

  function toCognosValues(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (!entry) {
        continue;
      }
      out.push({
        d: cognosDisplay(entry),
        u: entry.useValue != null ? String(entry.useValue) : ""
      });
    }
    return out;
  }

  function mapClearResult(_clearResult) {
    if (_clearResult && (_clearResult.skipped || _clearResult.ok)) {
      return { ok: true };
    }
    if (!_clearResult) {
      return { ok: false, blocker: "COGNOS_CLEAR_FAILED" };
    }
    return { ok: false, blocker: _clearResult.blocker || "COGNOS_SCOPE_CLEAR_REMAINING" };
  }

  function toAppliedResult(_result) {
    return _result.ok ? { applied: true } : { applied: false, blocker: _result.blocker };
  }

  function expectedForScope(_scopeId, _valuesByScope) {
    var values =
      _scopeId === "global" ? _valuesByScope.global : (_valuesByScope.pageContext || {})[_scopeId];
    if (!values || !Array.isArray(values) || !values.length) {
      return { mode: "empty" };
    }
    return { mode: "values", values: values };
  }

  function resolveReplayApplyOrder(_valuesByScope) {
    var valuesByScope = _valuesByScope || {};
    var globalValues = valuesByScope.global;
    var pageContext = valuesByScope.pageContext || {};
    var pageKeys = Object.keys(pageContext);
    var hasGlobal = Array.isArray(globalValues) && globalValues.length > 0;
    var allTargetTabsEmpty = true;
    var anyTargetTabHasValue = false;
    var idx;
    var tabValues;
    var phases;

    for (idx = 0; idx < pageKeys.length; idx += 1) {
      tabValues = pageContext[pageKeys[idx]];
      if (Array.isArray(tabValues) && tabValues.length > 0) {
        allTargetTabsEmpty = false;
        anyTargetTabHasValue = true;
      }
    }

    if (hasGlobal && allTargetTabsEmpty) {
      phases = ["pageContext", "global"];
    } else if (!hasGlobal && anyTargetTabHasValue) {
      phases = ["global", "pageContext"];
    } else {
      phases = ["global", "pageContext"];
    }

    return {
      phases: phases,
      hasGlobal: hasGlobal,
      allTargetTabsEmpty: allTargetTabsEmpty,
      anyTargetTabHasValue: anyTargetTabHasValue
    };
  }

  function toWriteResult(_outcome) {
    if (_outcome && _outcome.ok === true) {
      return { ok: true };
    }
    console.error(
      "[dienststelle.applyStoredScopeValues] host write not applied",
      _outcome ? (_outcome.errorCode || _outcome.reason) : null
    );
    return { ok: false, blocker: "COGNOS_REPLACE_FILTER_CONTEXT_FAILED" };
  }

  function applyScopeValues(_KDB, _activeFilterKey, _scopeId, _values, _filtersFacet, _missingApiBlocker) {
    var ref;
    var cognosValues;
    if (!_values || !Array.isArray(_values) || !_values.length) {
      return _clear.clearFilterScope(_KDB, _activeFilterKey, _scopeId, _filtersFacet).then(mapClearResult);
    }
    ref =
      _scopeId === "global"
        ? _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
        : _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _scopeId);
    if (!ref) {
      return Promise.resolve({ ok: false, blocker: _missingApiBlocker });
    }
    cognosValues = toCognosValues(_values);
    if (!cognosValues.length) {
      return _clear.clearFilterScope(_KDB, _activeFilterKey, _scopeId, _filtersFacet).then(mapClearResult);
    }
    return _filtersFacet.writeFilter({ ref: ref, values: cognosValues }).then(toWriteResult);
  }

  function waitPhaseStability(_KDB, _activeFilterKey, _filtersFacet, _touchedScopes, _valuesByScope) {
    var chain = Promise.resolve();
    var idx;
    for (idx = 0; idx < _touchedScopes.length; idx += 1) {
      (function (currentScopeId) {
        var expected = expectedForScope(currentScopeId, _valuesByScope);
        chain = chain.then(function () {
          return _selection
            .waitForStableScopeValues(_KDB, _activeFilterKey, currentScopeId, _filtersFacet, expected)
            .then(function (waitResult) {
              if (!waitResult.stable && expected.mode === "empty") {
                console.warn("[dienststelle.applyStoredScopeValues] stability wait timeout", currentScopeId);
              }
              return waitResult;
            });
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
      ).then(toAppliedResult);
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
            ).then(toAppliedResult);
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

  function applyStoredScopeValues(_KDB, _snapshot) {
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
    filtersFacet = _filterRef.readFiltersFacet(_KDB);
    if (!filtersFacet) {
      return Promise.resolve({ applied: false, blocker: "COGNOS_FILTER_API_UNAVAILABLE" });
    }
    activeFilterKey = _snapshot.activeFilterKey;
    valuesByScope = _snapshot.valuesByScope || {};
    pageContext = valuesByScope.pageContext || {};
    order = resolveReplayApplyOrder(valuesByScope);
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

  return {
    toCognosValues: toCognosValues,
    mapClearResult: mapClearResult,
    toAppliedResult: toAppliedResult,
    expectedForScope: expectedForScope,
    resolveReplayApplyOrder: resolveReplayApplyOrder,
    applyStoredScopeValues: applyStoredScopeValues
  };
});
