define([
  "../../state.js",
  "../hostScope/filterRef.js",
  "../hostScope/selection.js",
  "./defaults.js"
], function (_state, _filterRef, _selection, _defaults) {
  "use strict";

  function hasMemberList(_value) {
    if (_value == null) {
      return false;
    }
    if (Array.isArray(_value)) {
      return _value.length > 0;
    }
    return true;
  }

  function dispatchScopeAction(_dispatchInternal, _definition, _label, _scopeId, _selection, _actionType) {
    _dispatchInternal({
      type: _actionType,
      payload: {
        scopeId: _scopeId,
        filterKey: _definition.activeFilterKey,
        visibleFilterLabel: _label,
        selection: _selection
      }
    });
  }

  function buildCandidateScopes(_KDB, _context) {
    var context = _context || {};
    var normalizedScopeId;
    if (context.commitSourceScope === "pageContext") {
      if (context.scopeId == null || context.scopeId === "") {
        console.warn("[dienststelle.resolveDefaultTargets] pageContext commit without scopeId; default targeting stopped");
        return [];
      }
      normalizedScopeId = _filterRef.normalizeScopeId(context.scopeId);
      return [{ scopeId: String(context.scopeId), normalizedScopeId: normalizedScopeId }];
    }
    if (context.commitSourceScope === "global" && context.commitFromUser === true) {
      return _filterRef.listDashboardTabScopeIds(_KDB);
    }
    return [];
  }

  function resolveDefaultTargets(_KDB, _definition, _context, _globalValue) {
    var context = _context || {};
    var activeFilterKey = _definition.activeFilterKey;
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
    var candidateScopes = buildCandidateScopes(_KDB, context);
    var checkedScopes = [];
    var targetScopes = [];
    var existingValuesByScope = {};
    var idx;
    var candidate;
    var rawScopeId;
    var ref;
    var pageValue;

    for (idx = 0; idx < candidateScopes.length; idx += 1) {
      candidate = candidateScopes[idx];
      rawScopeId = _filterRef.resolveRawPageContextScope(
        _KDB,
        activeFilterKey,
        candidate.normalizedScopeId || candidate.scopeId
      );
      if (!rawScopeId) {
        continue;
      }
      ref = _filterRef.lookupFilterRef(_KDB, activeFilterKey, "pageContext", rawScopeId);
      if (!ref) {
        console.warn("[dienststelle.resolveDefaultTargets] lookupFilterRef failed", {
          activeFilterKey: activeFilterKey,
          scopeId: rawScopeId
        });
        continue;
      }
      checkedScopes.push(rawScopeId);
      pageValue = _selection.readFilterValues(ref, filtersFacet);
      if (hasMemberList(pageValue)) {
        existingValuesByScope[rawScopeId] = pageValue;
      } else if (!hasMemberList(_globalValue)) {
        targetScopes.push(rawScopeId);
      }
    }
    return {
      candidateScopes: candidateScopes,
      checkedScopes: checkedScopes,
      targetScopes: targetScopes,
      existingValuesByScope: existingValuesByScope
    };
  }

  function defaultScope(_KDB, _dispatchInternal, _definition, _label, _activeFilterKey, _filterScope, _scopeId, _ref) {
    return Promise.resolve(
      _defaults.applyDefault(_KDB, {
        filterRef: _ref,
        defaultTableKey: _definition.defaultTableKey,
        activeFilterKey: _activeFilterKey,
        filterScope: _filterScope,
        scopeId: _scopeId
      })
    ).then(function (appliedDefault) {
      if (appliedDefault) {
        dispatchScopeAction(
          _dispatchInternal,
          _definition,
          _label,
          _scopeId,
          appliedDefault,
          _state.ACTIONS.DEFAULT_APPLIED
        );
      }
      return appliedDefault;
    });
  }

  function observePageValue(_dispatchInternal, _definition, _label, _scopeId, _pageValue, _pageContextValuesByScope) {
    if (!_pageValue) {
      return;
    }
    _pageContextValuesByScope[_scopeId] = _pageValue;
    dispatchScopeAction(_dispatchInternal, _definition, _label, _scopeId, _pageValue, _state.ACTIONS.SELECTION_OBSERVED);
  }

  function walkPageScopes(
    _KDB,
    _dispatchInternal,
    _definition,
    _context,
    _label,
    _activeFilterKey,
    _filtersFacet,
    _globalValue,
    _pageContextValuesByScope,
    _mode,
    _preResolved
  ) {
    var resolved = _preResolved
      || (_mode === "userCommit" ? resolveDefaultTargets(_KDB, _definition, _context, _globalValue) : null);
    var targetScopes = resolved ? resolved.targetScopes : _filterRef.listPageContextScopes(_KDB, _activeFilterKey);
    var existingByScope = resolved ? resolved.existingValuesByScope : null;
    var appliedCount = 0;
    var scopeApplySteps = Promise.resolve();
    var scopeIds;
    var idx;
    var scopeId;

    function applyScopeStep(_currentScopeId) {
      var pageRef = _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _currentScopeId);
      var pageValue;
      if (!pageRef) {
        console.warn("[dienststelle.walkPageScopes] lookupFilterRef failed", {
          activeFilterKey: _activeFilterKey,
          scopeId: _currentScopeId
        });
        return undefined;
      }
      pageValue = _selection.readFilterValues(pageRef, _filtersFacet);
      if (_mode === "sync") {
        observePageValue(_dispatchInternal, _definition, _label, _currentScopeId, pageValue, _pageContextValuesByScope);
        return undefined;
      }
      if (_mode === "startup" && hasMemberList(pageValue)) {
        observePageValue(_dispatchInternal, _definition, _label, _currentScopeId, pageValue, _pageContextValuesByScope);
        return undefined;
      }
      if (_mode === "startup" && hasMemberList(_globalValue)) {
        return undefined;
      }
      return defaultScope(
        _KDB,
        _dispatchInternal,
        _definition,
        _label,
        _activeFilterKey,
        "pageContext",
        _currentScopeId,
        pageRef
      ).then(function (appliedDefault) {
        if (appliedDefault) {
          _pageContextValuesByScope[_currentScopeId] = [appliedDefault];
          appliedCount += 1;
        }
      });
    }

    if (existingByScope) {
      scopeIds = Object.keys(existingByScope);
      for (idx = 0; idx < scopeIds.length; idx += 1) {
        scopeId = scopeIds[idx];
        observePageValue(
          _dispatchInternal,
          _definition,
          _label,
          scopeId,
          existingByScope[scopeId],
          _pageContextValuesByScope
        );
      }
    }
    for (idx = 0; idx < targetScopes.length; idx += 1) {
      scopeApplySteps = scopeApplySteps.then(applyScopeStep.bind(null, targetScopes[idx]));
    }
    return scopeApplySteps.then(function () {
      return { appliedCount: appliedCount };
    });
  }

  return {
    hasMemberList: hasMemberList,
    dispatchScopeAction: dispatchScopeAction,
    resolveDefaultTargets: resolveDefaultTargets,
    defaultScope: defaultScope,
    walkPageScopes: walkPageScopes
  };
});
