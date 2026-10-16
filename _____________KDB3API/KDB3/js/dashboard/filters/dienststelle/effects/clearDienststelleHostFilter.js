define([
  "./readDienststelleHostSelection.js",
  "./clearDienststelleFilterScope.js"
], function (_hostSelection, _clearFilterScope) {
  "use strict";

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
    return _clearFilterScope(_KDB, _key, scopeIdArg, _filtersFacet).then(function (_result) {
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
    try {
      allowed = _payload && _payload.allowedClearTabIdxs;
      if (!Array.isArray(allowed)) { return true; }
      map = _payload && _payload.tabIdxToScopeId && typeof _payload.tabIdxToScopeId === "object"
        ? _payload.tabIdxToScopeId : {};
      wanted = _hostSelection.normalizeScopeId(_scopeId);
      if (!wanted || wanted === "global") { return false; }
      keys = Object.keys(map);
      for (idx = 0; idx < keys.length; idx += 1) {
        target = map[keys[idx]];
        if (_hostSelection.normalizeScopeId(target && target.scopeId) !== wanted) { continue; }
        tabIdx = parseInt(keys[idx], 10);
        if (!isFinite(tabIdx) || String(tabIdx) !== keys[idx]) { continue; }
        return allowed.indexOf(tabIdx) !== -1;
      }
      return false;
    } catch (error) {
      console.error("[dienststelle.isAllowedPageScope] failed", { scopeId: _scopeId }, error);
      throw error;
    }
  }

  function clearDienststelleHostFilter(_KDB, _activeFilterKey, _payload) {
    var filtersFacet;
    var pageScopes;
    var idx;
    var chain;
    var aggregate;
    try {
      filtersFacet = _hostSelection.readFiltersFacet(_KDB);
      if (!_activeFilterKey || !filtersFacet) {
        return Promise.resolve(emptyResult());
      }
      aggregate = { ok: true, clearedCount: 0, failedScopes: [], remainingScopes: [] };
      chain = clearScope(_KDB, filtersFacet, _activeFilterKey, "global", null).then(function (_scopeResult) {
        mergeScopeResult(aggregate, _scopeResult);
      });
      pageScopes = _hostSelection.listPageContextScopes(_KDB, _activeFilterKey);
      for (idx = 0; idx < pageScopes.length; idx += 1) {
        if (!isAllowedPageScope(pageScopes[idx], _payload)) { continue; }
        (function (scopeId) {
          chain = chain
            .then(function () {
              return clearScope(_KDB, filtersFacet, _activeFilterKey, "pageContext", scopeId);
            })
            .then(function (_scopeResult) {
              mergeScopeResult(aggregate, _scopeResult);
            });
        })(pageScopes[idx]);
      }
      return chain.then(function () {
        if (aggregate.remainingScopes.length) {
          aggregate.ok = false;
        }
        return aggregate;
      });
    } catch (error) {
      console.error("[dienststelle.clearDienststelleHostFilter] failed", error);
      throw error;
    }
  }

  return clearDienststelleHostFilter;
});
