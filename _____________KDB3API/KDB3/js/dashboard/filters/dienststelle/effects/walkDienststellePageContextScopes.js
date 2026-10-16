define([
  "../config/actions.js",
  "./applyDienststelleDefault.js",
  "./readDienststelleHostSelection.js",
  "./resolveDienststelleDefaultTargets.js",
  "./reconcileDienststelleScopeDispatch.js"
], function (_actions, _applyDefault, _hostSelection, _resolveDefaultTargets, _scopeDispatch) {
  "use strict";

  function defaultScope(_KDB, _dispatchInternal, _definition, _label, _activeFilterKey, _filterScope, _scopeId, _filterRef) {
    return Promise.resolve(_applyDefault(_KDB, { filterRef: _filterRef, defaultTableKey: _definition.defaultTableKey, activeFilterKey: _activeFilterKey, filterScope: _filterScope, scopeId: _scopeId }))
      .then(function (appliedDefault) {
        if (appliedDefault) {
          _scopeDispatch.dispatchScopeAction(_dispatchInternal, _definition, _label, _scopeId, appliedDefault, _actions.DEFAULT_APPLIED);
        }
        return appliedDefault;
      });
  }

  function hasMemberList(_value) {
    if (_value == null) {
      return false;
    }
    if (Array.isArray(_value)) {
      return _value.length > 0;
    }
    return true;
  }

  function observePageValue(_dispatchInternal, _definition, _label, _scopeId, _pageValue, _pageContextValuesByScope) {
    if (!_pageValue) {
      return;
    }
    _pageContextValuesByScope[_scopeId] = _pageValue;
    _scopeDispatch.dispatchScopeAction(_dispatchInternal, _definition, _label, _scopeId, _pageValue, _actions.SELECTION_OBSERVED);
  }

  function walkPageScopes(_KDB, _dispatchInternal, _definition, _context, _label, _activeFilterKey, _filtersFacet, _globalValue, _pageContextValuesByScope, _mode, _preResolved) {
    var resolved = _preResolved || (_mode === "userCommit" ? _resolveDefaultTargets(_KDB, _definition, _context, _globalValue) : null);
    var targetScopes = resolved ? resolved.targetScopes : _hostSelection.listPageContextScopes(_KDB, _activeFilterKey);
    var existingByScope = resolved ? resolved.existingValuesByScope : null;
    var appliedCount = 0;
    var scopeApplySteps = Promise.resolve();
    var scopeIds;
    var idx;
    var scopeId;
    if (existingByScope) {
      scopeIds = Object.keys(existingByScope);
      for (idx = 0; idx < scopeIds.length; idx += 1) {
        scopeId = scopeIds[idx];
        observePageValue(_dispatchInternal, _definition, _label, scopeId, existingByScope[scopeId], _pageContextValuesByScope);
      }
    }
    for (idx = 0; idx < targetScopes.length; idx += 1) {
      (function (currentScopeId) {
        scopeApplySteps = scopeApplySteps.then(function () {
          var pageRef = _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", currentScopeId);
          var pageValue;
          if (!pageRef) {
            console.warn("[dienststelle.reconcileDienststelleHostScopes] lookupFilterRef failed", { activeFilterKey: _activeFilterKey, scopeId: currentScopeId });
            return;
          }
          pageValue = _hostSelection.readFilterValues(pageRef, _filtersFacet);
          if (_mode === "sync") {
            observePageValue(_dispatchInternal, _definition, _label, currentScopeId, pageValue, _pageContextValuesByScope);
            return;
          }
          if (_mode === "startup" && hasMemberList(pageValue)) {
            observePageValue(_dispatchInternal, _definition, _label, currentScopeId, pageValue, _pageContextValuesByScope);
            return;
          }
          if (_mode === "startup" && hasMemberList(_globalValue)) {
            return;
          }
          return defaultScope(_KDB, _dispatchInternal, _definition, _label, _activeFilterKey, "pageContext", currentScopeId, pageRef).then(function (appliedDefault) {
            if (appliedDefault) {
              _pageContextValuesByScope[currentScopeId] = [appliedDefault];
              appliedCount += 1;
            }
          });
        });
      })(targetScopes[idx]);
    }
    return scopeApplySteps.then(function () { return { appliedCount: appliedCount }; });
  }

  return {
    walkPageScopes: walkPageScopes,
    observePageValue: observePageValue,
    defaultScope: defaultScope
  };
});
