define(["./readDienststelleHostSelection.js", "./listDashboardTabScopeIds.js"], function (
  _hostSelection,
  _listDashboardTabScopeIds
) {
  "use strict";

  function buildCandidateScopes(_KDB, _context) {
    var context = _context || {};
    var normalizedScopeId;
    if (context.commitSourceScope === "pageContext") {
      if (context.scopeId == null || context.scopeId === "") {
        console.warn(
          "[dienststelle.resolveDienststelleDefaultTargets] pageContext commit without scopeId; default targeting stopped"
        );
        return [];
      }
      normalizedScopeId = _hostSelection.normalizeScopeId(context.scopeId);
      return [{ scopeId: String(context.scopeId), normalizedScopeId: normalizedScopeId }];
    }
    if (context.commitSourceScope === "global" && context.commitFromUser === true) {
      return _listDashboardTabScopeIds(_KDB);
    }
    return [];
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

  function __controller(_KDB, _definition, _context, _globalValue) {
    var context = _context || {};
    var activeFilterKey = _definition.activeFilterKey;
    var filtersFacet = _hostSelection.readFiltersFacet(_KDB);
    var candidateScopes = buildCandidateScopes(_KDB, context);
    var checkedScopes = [];
    var targetScopes = [];
    var existingValuesByScope = {};
    var idx;
    var candidate;
    var rawScopeId;
    var filterRef;
    var pageValue;

    for (idx = 0; idx < candidateScopes.length; idx += 1) {
      candidate = candidateScopes[idx];
      rawScopeId = _hostSelection.resolveRawPageContextScope(
        _KDB,
        activeFilterKey,
        candidate.normalizedScopeId || candidate.scopeId
      );
      if (!rawScopeId) {
        continue;
      }
      filterRef = _hostSelection.lookupFilterRef(_KDB, activeFilterKey, "pageContext", rawScopeId);
      if (!filterRef) {
        console.warn("[dienststelle.resolveDienststelleDefaultTargets] lookupFilterRef failed", {
          activeFilterKey: activeFilterKey,
          scopeId: rawScopeId
        });
        continue;
      }
      checkedScopes.push(rawScopeId);
      pageValue = _hostSelection.readFilterValues(filterRef, filtersFacet);
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

  return __controller;
});
