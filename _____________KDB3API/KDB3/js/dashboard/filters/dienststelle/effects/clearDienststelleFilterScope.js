define(["./readDienststelleHostSelection.js"], function (_hostSelection) {
  "use strict";

  var CLEAR_REMAINING = "COGNOS_SCOPE_CLEAR_REMAINING";
  var CLEAR_FAILED = "COGNOS_CLEAR_FAILED";

  function replaceWithEmpty(_filtersFacet, _filterRef) {
    return _filtersFacet.writeFilter({ ref: _filterRef, values: [] });
  }

  // The facet reports a refused clearValues as a failed Outcome instead of
  // throwing, so the fallback keys on that. An aborted outcome is not a refusal
  // and must not trigger a second write.
  function fallbackToReplaceEmpty(_filtersFacet, _filterRef, _outcome) {
    if (_outcome && _outcome.outcome === "failed") {
      console.warn("[dienststelle.clearDienststelleFilterScope] clear failed", _outcome.errorCode);
      return replaceWithEmpty(_filtersFacet, _filterRef);
    }
    return _outcome;
  }

  function clearScopeOnHost(_filtersFacet, _filterRef, _isPageContext) {
    if (!_isPageContext) {
      return replaceWithEmpty(_filtersFacet, _filterRef);
    }
    return _filtersFacet
      .clearFilter(_filterRef)
      .then(fallbackToReplaceEmpty.bind(null, _filtersFacet, _filterRef));
  }

  // Success is decided by re-reading the values, not by the write outcome. That
  // is the pre-existing contract of this function and it stays: a host that
  // accepts the command but keeps the value must still count as not cleared.
  function hasRemainingHostValues(_values) {
    return _values != null && _values.length > 0;
  }

  function buildClearResult(_filterRef, _filtersFacet) {
    var remaining = hasRemainingHostValues(_hostSelection.readFilterValues(_filterRef, _filtersFacet));
    return {
      ok: !remaining,
      remaining: remaining,
      blocker: remaining ? CLEAR_REMAINING : null
    };
  }

  function reportClearError(_error) {
    console.error("[dienststelle.clearDienststelleFilterScope]", _error);
    return { ok: false, remaining: false, blocker: CLEAR_FAILED };
  }

  function clearDienststelleFilterScope(_KDB, _activeFilterKey, _scopeId, _filtersFacet) {
    var isGlobal = _scopeId === "global";
    var filterRef = isGlobal
      ? _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
      : _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _scopeId);
    if (!filterRef || !_filtersFacet) {
      return Promise.resolve({ ok: true, skipped: true, remaining: false });
    }
    return clearScopeOnHost(_filtersFacet, filterRef, !isGlobal)
      .then(buildClearResult.bind(null, filterRef, _filtersFacet))
      .catch(reportClearError);
  }

  return clearDienststelleFilterScope;
});
