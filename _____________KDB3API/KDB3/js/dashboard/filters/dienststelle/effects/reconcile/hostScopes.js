define([
  "../../state.js",
  "../../../../../core/utils/kit/runtime.js",
  "../hostScope/filterRef.js",
  "../hostScope/selection.js",
  "./pageScopes.js",
  "./defaults.js"
], function (_state, _kitRuntime, _filterRef, _selection, _pageScopes, _defaults) {
  "use strict";

  var hasMemberList = _pageScopes.hasMemberList;

  // Macrotask: Cognos commits the host value after the confirm event; a microtask reads it too early.
  // Tracked in runtime.timers (one key per hop) so destroy cancels a pending reconcile.
  function yieldToHost(_KDB) {
    var runtime = _KDB.runtime.dienststelle;
    runtime.userCommitHopSeq = (runtime.userCommitHopSeq || 0) + 1;
    return new Promise(function (resolve) {
      _kitRuntime.scheduleTimeout(runtime.timers, "userCommitHop" + runtime.userCommitHopSeq, resolve, 0);
    });
  }

  function toDominantValues(_globalValue) {
    if (Array.isArray(_globalValue)) {
      return _globalValue.slice();
    }
    if (_globalValue) {
      return [_globalValue];
    }
    return [];
  }

  function finishReconcile(_dispatchInternal, _definition, _context, _label, _globalValue, _pageContextValuesByScope) {
    var resolution = {
      dominantScope: hasMemberList(_globalValue) ? "global" : null,
      dominantValues: toDominantValues(_globalValue),
      pageContextValuesByScope: _pageContextValuesByScope
    };
    _dispatchInternal({
      type: _state.ACTIONS.SYNC_REQUESTED,
      payload: {
        activeSichtValue: _definition.activeSichtValue,
        activeFilterKey: _definition.activeFilterKey,
        visibleFilterLabel: _label,
        activeHierarchyTableKey: _definition.hierarchyTableKey,
        activeDefaultTableKey: _definition.defaultTableKey,
        dominantScope: resolution.dominantScope,
        dominantValues: resolution.dominantValues,
        pageContextValuesByScope: resolution.pageContextValuesByScope,
        source: _context.source || "sync",
        isHistoryReplay: _context.isHistoryReplay === true
      }
    });
    return {
      activeSichtValue: _definition.activeSichtValue,
      activeFilterKey: _definition.activeFilterKey,
      visibleFilterLabel: _label,
      resolution: resolution,
      readinessFailed: false
    };
  }

  function resolveCommitSourceScope(_context) {
    var context = _context || {};
    return context.commitSourceScope || (context.filterScope === "pageContext" ? "pageContext" : "global");
  }

  function isUserClearCommit(_context) {
    var context = _context || {};
    return context.commitFromUser === true && context.commitSourceWasClear === true;
  }

  function dispatchScopeClear(_dispatchInternal, _definition, _label, _scopeId) {
    _dispatchInternal({
      type: _state.ACTIONS.SELECTION_CLEARED,
      payload: {
        scopeId: _scopeId,
        filterKey: _definition.activeFilterKey,
        visibleFilterLabel: _label
      }
    });
  }

  function resolveClearedScopeId(_KDB, _definition, _context) {
    var context = _context || {};
    if (resolveCommitSourceScope(context) === "pageContext") {
      return _filterRef.resolveRawPageContextScope(_KDB, _definition.activeFilterKey, context.scopeId)
        || context.scopeId;
    }
    return "global";
  }

  function resolveUserConfirmMode(_context, _hostGlobalValue, _effectiveGlobalValue, _pageValue) {
    var commitSourceScope = resolveCommitSourceScope(_context);
    var allowDefaulting = _context.allowDefaulting === true && _context.isHistoryReplay !== true;
    if (!allowDefaulting) {
      return "sync";
    }
    if (commitSourceScope === "global" && (isUserClearCommit(_context) || !hasMemberList(_hostGlobalValue))) {
      return "userCommit";
    }
    if (
      commitSourceScope === "pageContext" &&
      !hasMemberList(_effectiveGlobalValue) &&
      (isUserClearCommit(_context) || !hasMemberList(_pageValue))
    ) {
      return "userCommit";
    }
    return "sync";
  }

  function resolveWalkMode(_context, _globalValue) {
    if (_context.source === "tableData") {
      return "sync";
    }
    if (_context.isHistoryReplay === true) {
      return "sync";
    }
    if (hasMemberList(_globalValue)) {
      return "sync";
    }
    return "startup";
  }

  function readCommittedPageValue(_KDB, _definition, _context, _activeFilterKey, _filtersFacet) {
    var pageScopeId;
    var pageRef;
    if (resolveCommitSourceScope(_context) !== "pageContext") {
      return null;
    }
    pageScopeId = resolveClearedScopeId(_KDB, _definition, _context);
    pageRef = _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", pageScopeId);
    if (!pageRef) {
      return null;
    }
    return _selection.readFilterValues(pageRef, _filtersFacet);
  }

  function readEffectiveGlobalValue(_KDB, _definition, _hostGlobalValue) {
    var filtersState;
    var filterState;
    var globalScope;
    var values;
    if (hasMemberList(_hostGlobalValue)) {
      return _hostGlobalValue;
    }
    filtersState = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
    filterState = filtersState && filtersState.byFilter ? filtersState.byFilter[_definition.activeFilterKey] : null;
    globalScope = filterState && filterState.currentSelectionByScope ? filterState.currentSelectionByScope.global : null;
    values = globalScope && globalScope.currentValues;
    if (Array.isArray(values) && values.length) {
      return values;
    }
    return null;
  }

  function runUserCommit(_run, _commitSourceScope, _effectiveGlobalValue) {
    var KDB = _run.KDB;
    var dispatchInternal = _run.dispatchInternal;
    var definition = _run.definition;
    var context = _run.context;
    var finishGlobalValue = _commitSourceScope === "global" ? null : _effectiveGlobalValue;
    var pageContextValuesByScope = {};
    dispatchScopeClear(
      dispatchInternal,
      definition,
      _run.label,
      resolveClearedScopeId(KDB, definition, context)
    );
    return _pageScopes.walkPageScopes(
      KDB,
      dispatchInternal,
      definition,
      context,
      _run.label,
      _run.activeFilterKey,
      _run.filtersFacet,
      finishGlobalValue,
      pageContextValuesByScope,
      "userCommit",
      _pageScopes.resolveDefaultTargets(KDB, definition, context, finishGlobalValue)
    ).then(function (walkResult) {
      _defaults.notifyEmptyOk(KDB, {
        appliedCount: walkResult && walkResult.appliedCount,
        commitFromUser: true,
        isHistoryReplay: context.isHistoryReplay === true,
        activeFilterKey: _run.activeFilterKey,
        visibleFilterLabel: _run.label,
        filterScope: _commitSourceScope
      });
      return finishReconcile(
        dispatchInternal,
        definition,
        context,
        _run.label,
        finishGlobalValue,
        pageContextValuesByScope
      );
    });
  }

  function runUserConfirmAfterHostRead(_run, _globalRef) {
    return yieldToHost(_run.KDB).then(function () {
      var KDB = _run.KDB;
      var dispatchInternal = _run.dispatchInternal;
      var definition = _run.definition;
      var context = _run.context;
      var pageContextValuesByScope = {};
      var hostGlobalValue = _selection.readFilterValues(_globalRef, _run.filtersFacet);
      var effectiveGlobalValue = readEffectiveGlobalValue(KDB, definition, hostGlobalValue);
      var pageValue = readCommittedPageValue(KDB, definition, context, _run.activeFilterKey, _run.filtersFacet);
      var mode = resolveUserConfirmMode(context, hostGlobalValue, effectiveGlobalValue, pageValue);
      var commitSourceScope = resolveCommitSourceScope(context);
      if (mode === "userCommit") {
        return runUserCommit(_run, commitSourceScope, effectiveGlobalValue);
      }
      if (hasMemberList(effectiveGlobalValue)) {
        _pageScopes.dispatchScopeAction(
          dispatchInternal,
          definition,
          _run.label,
          "global",
          effectiveGlobalValue,
          _state.ACTIONS.SELECTION_OBSERVED
        );
      }
      if (commitSourceScope === "pageContext" && (isUserClearCommit(context) || !hasMemberList(pageValue))) {
        dispatchScopeClear(
          dispatchInternal,
          definition,
          _run.label,
          resolveClearedScopeId(KDB, definition, context)
        );
      }
      return _pageScopes.walkPageScopes(
        KDB,
        dispatchInternal,
        definition,
        context,
        _run.label,
        _run.activeFilterKey,
        _run.filtersFacet,
        effectiveGlobalValue,
        pageContextValuesByScope,
        "sync",
        null
      ).then(function () {
        return finishReconcile(
          dispatchInternal,
          definition,
          context,
          _run.label,
          effectiveGlobalValue,
          pageContextValuesByScope
        );
      });
    });
  }

  function walkAndFinish(_run, _globalValue, _walkGlobalValue, _mode) {
    var pageContextValuesByScope = {};
    return _pageScopes.walkPageScopes(
      _run.KDB,
      _run.dispatchInternal,
      _run.definition,
      _run.context,
      _run.label,
      _run.activeFilterKey,
      _run.filtersFacet,
      _walkGlobalValue,
      pageContextValuesByScope,
      _mode,
      null
    ).then(function () {
      return finishReconcile(
        _run.dispatchInternal,
        _run.definition,
        _run.context,
        _run.label,
        _globalValue,
        pageContextValuesByScope
      );
    });
  }

  function continueAfterGlobalRead(_run, _globalValue, _globalRef) {
    var context = _run.context;
    var mode;
    if (context.commitFromUser === true && context.isHistoryReplay !== true) {
      return runUserConfirmAfterHostRead(_run, _globalRef);
    }
    mode = resolveWalkMode(context, _globalValue);
    if (hasMemberList(_globalValue)) {
      _pageScopes.dispatchScopeAction(
        _run.dispatchInternal,
        _run.definition,
        _run.label,
        "global",
        _globalValue,
        _state.ACTIONS.SELECTION_OBSERVED
      );
    }
    if (mode === "startup") {
      return _pageScopes.defaultScope(
        _run.KDB,
        _run.dispatchInternal,
        _run.definition,
        _run.label,
        _run.activeFilterKey,
        "global",
        "global",
        _globalRef
      ).then(function (appliedDefault) {
        return walkAndFinish(_run, appliedDefault || _globalValue, appliedDefault || _globalValue, "startup");
      });
    }
    return walkAndFinish(_run, _globalValue, _globalValue, mode);
  }

  function reconcileHostScopes(_KDB, _dispatchInternal, _definition, _context) {
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
    var run = {
      KDB: _KDB,
      dispatchInternal: _dispatchInternal,
      definition: _definition,
      context: _context || {},
      label: _definition.visibleFilterLabel,
      activeFilterKey: _definition.activeFilterKey,
      filtersFacet: filtersFacet
    };
    var globalRef = _filterRef.lookupFilterRef(_KDB, run.activeFilterKey, "global", null);
    return continueAfterGlobalRead(run, _selection.readFilterValues(globalRef, filtersFacet), globalRef);
  }

  return {
    reconcileHostScopes: reconcileHostScopes
  };
});
