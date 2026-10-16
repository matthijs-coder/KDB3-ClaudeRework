define([
  "../config/actions.js",
  "./readDienststelleHostSelection.js",
  "./resolveDienststelleDefaultTargets.js",
  "./reconcileDienststelleScopeDispatch.js",
  "./walkDienststellePageContextScopes.js",
  "./resolveDienststelleReconcileMode.js",
  "./notifyDienststelleEmptyOk.js"
], function (_actions, _hostSelection, _resolveDefaultTargets, _scopeDispatch, _walkScopes, _modeResolver, _notifyDienststelleEmptyOk) {
  "use strict";
  var USER_COMMIT_DEFAULT_DELAY_MS = 0;

  function hasMemberList(_value) {
    if (_value == null) {
      return false;
    }
    if (Array.isArray(_value)) {
      return _value.length > 0;
    }
    return true;
  }

  function delayMs(_ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, _ms);
    });
  }

  function runUserConfirmAfterHostRead(_KDB, _dispatchInternal, _definition, _context, _label, _activeFilterKey, _filtersFacet, _globalRef) {
    return delayMs(USER_COMMIT_DEFAULT_DELAY_MS).then(function () {
      var pageContextValuesByScope = {};
      var hostGlobalValue = _hostSelection.readFilterValues(_globalRef, _filtersFacet);
      var effectiveGlobalValue = _modeResolver.readEffectiveGlobalValue(_KDB, _definition, hostGlobalValue);
      var pageValue = _modeResolver.readCommittedPageValue(_KDB, _definition, _context, _activeFilterKey, _filtersFacet);
      var mode = _modeResolver.resolveUserConfirmMode(_context, hostGlobalValue, effectiveGlobalValue, pageValue);
      var finishGlobalValue = hostGlobalValue;
      var commitSourceScope = _scopeDispatch.resolveCommitSourceScope(_context);
      if (mode === "userCommit") {
        finishGlobalValue = commitSourceScope === "global" ? null : effectiveGlobalValue;
        _scopeDispatch.dispatchScopeClear(_dispatchInternal, _definition, _label, _scopeDispatch.resolveClearedScopeId(_KDB, _definition, _context));
        return _walkScopes.walkPageScopes(
          _KDB,
          _dispatchInternal,
          _definition,
          _context,
          _label,
          _activeFilterKey,
          _filtersFacet,
          finishGlobalValue,
          pageContextValuesByScope,
          "userCommit",
          _resolveDefaultTargets(_KDB, _definition, _context, finishGlobalValue)
        ).then(function (walkResult) {
          var appliedCount = walkResult && walkResult.appliedCount;
          _notifyDienststelleEmptyOk(_KDB, {
            appliedCount: appliedCount,
            commitFromUser: true,
            isHistoryReplay: _context.isHistoryReplay === true,
            activeFilterKey: _activeFilterKey,
            visibleFilterLabel: _label,
            filterScope: commitSourceScope
          });
          return _scopeDispatch.finishReconcile(_dispatchInternal, _definition, _context, _label, finishGlobalValue, pageContextValuesByScope);
        });
      }
      if (hasMemberList(effectiveGlobalValue)) {
        _scopeDispatch.dispatchScopeAction(_dispatchInternal, _definition, _label, "global", effectiveGlobalValue, _actions.SELECTION_OBSERVED);
      }
      if (commitSourceScope === "pageContext" && (_scopeDispatch.isUserClearCommit(_context) || !hasMemberList(pageValue))) {
        _scopeDispatch.dispatchScopeClear(_dispatchInternal, _definition, _label, _scopeDispatch.resolveClearedScopeId(_KDB, _definition, _context));
      }
      return _walkScopes.walkPageScopes(_KDB, _dispatchInternal, _definition, _context, _label, _activeFilterKey, _filtersFacet, effectiveGlobalValue, pageContextValuesByScope, "sync", null)
        .then(function () {
          return _scopeDispatch.finishReconcile(_dispatchInternal, _definition, _context, _label, effectiveGlobalValue, pageContextValuesByScope);
        });
    });
  }

  function continueAfterGlobalRead(_KDB, _dispatchInternal, _definition, _context, _label, _activeFilterKey, _filtersFacet, _globalValue, _globalRef) {
    var pageContextValuesByScope = {};
    var mode;
    if (_context.commitFromUser === true && _context.isHistoryReplay !== true) {
      return runUserConfirmAfterHostRead(_KDB, _dispatchInternal, _definition, _context, _label, _activeFilterKey, _filtersFacet, _globalRef);
    }
    mode = _modeResolver.resolveWalkMode(_context, _globalValue);
    if (hasMemberList(_globalValue)) {
      _scopeDispatch.dispatchScopeAction(_dispatchInternal, _definition, _label, "global", _globalValue, _actions.SELECTION_OBSERVED);
    }
    if (mode === "startup") {
      return _walkScopes.defaultScope(_KDB, _dispatchInternal, _definition, _label, _activeFilterKey, "global", "global", _globalRef).then(function (appliedDefault) {
        return _walkScopes.walkPageScopes(_KDB, _dispatchInternal, _definition, _context, _label, _activeFilterKey, _filtersFacet, appliedDefault || _globalValue, pageContextValuesByScope, "startup", null)
          .then(function () { return _scopeDispatch.finishReconcile(_dispatchInternal, _definition, _context, _label, appliedDefault || _globalValue, pageContextValuesByScope); });
      });
    }
    return _walkScopes.walkPageScopes(_KDB, _dispatchInternal, _definition, _context, _label, _activeFilterKey, _filtersFacet, _globalValue, pageContextValuesByScope, mode, null)
      .then(function () { return _scopeDispatch.finishReconcile(_dispatchInternal, _definition, _context, _label, _globalValue, pageContextValuesByScope); });
  }

  function __controller(_KDB, _dispatchInternal, _definition, _context) {
    var context = _context || {};
    var filtersFacet = _hostSelection.readFiltersFacet(_KDB);
    var activeFilterKey = _definition.activeFilterKey;
    var visibleFilterLabel = _definition.visibleFilterLabel;
    var globalRef = _hostSelection.lookupFilterRef(_KDB, activeFilterKey, "global", null);
    return continueAfterGlobalRead(_KDB, _dispatchInternal, _definition, context, visibleFilterLabel, activeFilterKey, filtersFacet, _hostSelection.readFilterValues(globalRef, filtersFacet), globalRef);
  }
  return __controller;
});
