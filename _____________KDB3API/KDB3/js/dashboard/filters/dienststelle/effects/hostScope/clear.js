define([
  "../../state.js",
  "../../config.js",
  "../../view/chromeClasses.js",
  "./filterRef.js",
  "./selection.js"
], function (_state, _config, _chromeClasses, _filterRef, _selection) {
  "use strict";

  var CLEAR_REMAINING = "COGNOS_SCOPE_CLEAR_REMAINING";
  var CLEAR_FAILED = "COGNOS_CLEAR_FAILED";

  function replaceWithEmpty(_filtersFacet, _ref) {
    return _filtersFacet.writeFilter({ ref: _ref, values: [] });
  }

  // The facet reports a refused clearValues as a failed Outcome instead of
  // throwing, so the fallback keys on that. An aborted outcome is not a refusal
  // and must not trigger a second write.
  function fallbackToReplaceEmpty(_filtersFacet, _ref, _outcome) {
    if (_outcome && _outcome.outcome === "failed") {
      console.warn("[dienststelle.clearFilterScope] clear failed", _outcome.errorCode);
      return replaceWithEmpty(_filtersFacet, _ref);
    }
    return _outcome;
  }

  function clearScopeOnHost(_filtersFacet, _ref, _isPageContext) {
    if (!_isPageContext) {
      return replaceWithEmpty(_filtersFacet, _ref);
    }
    return _filtersFacet.clearFilter(_ref).then(fallbackToReplaceEmpty.bind(null, _filtersFacet, _ref));
  }

  // Success is decided by re-reading the values, not by the write outcome. That
  // is the pre-existing contract of this function and it stays: a host that
  // accepts the command but keeps the value must still count as not cleared.
  function hasRemainingHostValues(_values) {
    return _values != null && _values.length > 0;
  }

  function buildClearResult(_ref, _filtersFacet) {
    var remaining = hasRemainingHostValues(_selection.readFilterValues(_ref, _filtersFacet));
    return {
      ok: !remaining,
      remaining: remaining,
      blocker: remaining ? CLEAR_REMAINING : null
    };
  }

  function reportClearError(_error) {
    console.error("[dienststelle.clearFilterScope]", _error);
    return { ok: false, remaining: false, blocker: CLEAR_FAILED };
  }

  function clearFilterScope(_KDB, _activeFilterKey, _scopeId, _filtersFacet) {
    var isGlobal = _scopeId === "global";
    var ref = isGlobal
      ? _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
      : _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _scopeId);
    if (!ref || !_filtersFacet) {
      return Promise.resolve({ ok: true, skipped: true, remaining: false });
    }
    return clearScopeOnHost(_filtersFacet, ref, !isGlobal)
      .then(buildClearResult.bind(null, ref, _filtersFacet))
      .catch(reportClearError);
  }

  function emptyResult() {
    return { ok: true, clearedCount: 0, failedScopes: [], remainingScopes: [] };
  }

  function scopeLabel(_scopeType, _scopeId) {
    return _scopeType === "global" ? "global" : "pageContext:" + String(_scopeId);
  }

  function scopeOutcome(_ok, _count, _scope, _remaining) {
    return { ok: _ok, clearedCount: _count, scope: _scope, remaining: _remaining };
  }

  function mergeScopeResult(_aggregate, _scopeResult) {
    var list;
    if (!_scopeResult) {
      return;
    }
    _aggregate.clearedCount += _scopeResult.clearedCount || 0;
    if (_scopeResult.ok !== true) {
      _aggregate.ok = false;
      list = _aggregate.failedScopes;
      if (_scopeResult.scope && list.indexOf(_scopeResult.scope) === -1) {
        list.push(_scopeResult.scope);
      }
    }
    if (_scopeResult.remaining === true && _scopeResult.scope) {
      list = _aggregate.remainingScopes;
      if (list.indexOf(_scopeResult.scope) === -1) {
        list.push(_scopeResult.scope);
      }
    }
  }

  function mapSharedClearResult(_label, _result) {
    if (!_result || _result.skipped) {
      return null;
    }
    if (_result.ok) {
      return scopeOutcome(true, 1, _label, false);
    }
    if (_result.remaining) {
      return scopeOutcome(false, 1, _label, true);
    }
    return scopeOutcome(false, 0, _label, false);
  }

  function clearScope(_KDB, _filtersFacet, _key, _scopeType, _scopeId) {
    var label = scopeLabel(_scopeType, _scopeId);
    var scopeIdArg = _scopeType === "global" ? "global" : _scopeId;
    return clearFilterScope(_KDB, _key, scopeIdArg, _filtersFacet).then(function (_result) {
      return mapSharedClearResult(label, _result);
    });
  }

  function isAllowedPageScope(_scopeId, _payload) {
    var allowed;
    var map;
    var wanted;
    var keys;
    var idx;
    var target;
    var tabIdx;
    allowed = _payload && _payload.allowedClearTabIdxs;
    if (!Array.isArray(allowed)) {
      return true;
    }
    map = _payload && _payload.tabIdxToScopeId && typeof _payload.tabIdxToScopeId === "object"
      ? _payload.tabIdxToScopeId
      : {};
    wanted = _filterRef.normalizeScopeId(_scopeId);
    if (!wanted || wanted === "global") {
      return false;
    }
    keys = Object.keys(map);
    for (idx = 0; idx < keys.length; idx += 1) {
      target = map[keys[idx]];
      if (_filterRef.normalizeScopeId(target && target.scopeId) !== wanted) {
        continue;
      }
      tabIdx = parseInt(keys[idx], 10);
      if (!isFinite(tabIdx) || String(tabIdx) !== keys[idx]) {
        continue;
      }
      return allowed.indexOf(tabIdx) !== -1;
    }
    return false;
  }

  function clearPageScopeInto(_KDB, _filtersFacet, _activeFilterKey, _aggregate, _scopeId) {
    return clearScope(_KDB, _filtersFacet, _activeFilterKey, "pageContext", _scopeId).then(function (_scopeResult) {
      mergeScopeResult(_aggregate, _scopeResult);
    });
  }

  function clearHostFilter(_KDB, _activeFilterKey, _payload) {
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
    var pageScopes;
    var idx;
    var chain;
    var aggregate;
    if (!_activeFilterKey || !filtersFacet) {
      return Promise.resolve(emptyResult());
    }
    aggregate = emptyResult();
    chain = clearScope(_KDB, filtersFacet, _activeFilterKey, "global", null).then(function (_scopeResult) {
      mergeScopeResult(aggregate, _scopeResult);
    });
    pageScopes = _filterRef.listPageContextScopes(_KDB, _activeFilterKey);
    for (idx = 0; idx < pageScopes.length; idx += 1) {
      if (!isAllowedPageScope(pageScopes[idx], _payload)) {
        continue;
      }
      chain = chain.then(clearPageScopeInto.bind(null, _KDB, filtersFacet, _activeFilterKey, aggregate, pageScopes[idx]));
    }
    return chain.then(function () {
      if (aggregate.remainingScopes.length) {
        aggregate.ok = false;
      }
      return aggregate;
    });
  }

  function dispatchInactiveStatus(_dispatchInternal, _definition) {
    _dispatchInternal({
      type: _state.ACTIONS.FILTER_STATUS_CHANGED,
      payload: {
        filterKey: _definition.activeFilterKey,
        visibleFilterLabel: _definition.visibleFilterLabel,
        status: "inactive",
        isActive: false
      }
    });
  }

  function dispatchInactiveClearError(_dispatchInternal, _definition, _result) {
    var remaining = _result && _result.remainingScopes ? _result.remainingScopes.join(", ") : "";
    var failed = _result && _result.failedScopes ? _result.failedScopes.join(", ") : "";
    console.warn(
      "[dienststelle.deactivateInactiveVariants] inactive clear failed",
      _definition.activeFilterKey,
      { failedScopes: failed, remainingScopes: remaining }
    );
    _dispatchInternal({
      type: _state.ACTIONS.FILTER_STATUS_CHANGED,
      payload: {
        filterKey: _definition.activeFilterKey,
        visibleFilterLabel: _definition.visibleFilterLabel,
        status: "error",
        isActive: false,
        errorCode: "DIENSTSTELLE_INACTIVE_CLEAR_FAILED",
        errorMessage:
          "Inactive Dienststelle variant could not be cleared in Cognos host (" +
          _definition.activeFilterKey +
          ")."
      }
    });
  }

  function deactivateOneVariant(_KDB, _dispatchInternal, _definition) {
    return clearHostFilter(_KDB, _definition.activeFilterKey).then(function (_result) {
      if (_result && _result.ok === true) {
        dispatchInactiveStatus(_dispatchInternal, _definition);
        return;
      }
      dispatchInactiveClearError(_dispatchInternal, _definition, _result);
    });
  }

  function deactivateInactiveVariants(_KDB, _dispatchInternal, _activeDefinition) {
    var keys = Object.keys(_config.DEFINITIONS);
    var idx;
    var definition;
    var chain = Promise.resolve();
    if (!_activeDefinition || !_activeDefinition.activeFilterKey) {
      return Promise.resolve();
    }
    for (idx = 0; idx < keys.length; idx += 1) {
      definition = _config.DEFINITIONS[keys[idx]];
      if (definition.activeFilterKey === _activeDefinition.activeFilterKey) {
        continue;
      }
      chain = chain.then(deactivateOneVariant.bind(null, _KDB, _dispatchInternal, definition));
    }
    return chain.then(function () {
      _chromeClasses.syncDienststelleWrapperClasses(_activeDefinition, _KDB);
    });
  }

  return {
    clearFilterScope: clearFilterScope,
    clearHostFilter: clearHostFilter,
    deactivateInactiveVariants: deactivateInactiveVariants
  };
});
