define([
  "../state/ensureFilterState.js",
  "./guardInteractionFreshness.js",
  "./runInteractionByIntent.js",
  "./sichtDraftEvents.js",
  "./recordFilterDockDiagnostics.js"
], function (
  _ensureFilterState,
  _guardInteractionFreshness,
  _runInteractionByIntent,
  _sichtDraftEvents,
  _diagnostics
) {
  "use strict";

  function stampLastInteraction(_root, _handoffContext, _resolved) {
    _root.lastInteraction = {
      filterInstanceId: _resolved.filterInstanceId,
      filterKey: _handoffContext.filterKey,
      filterLabel: _handoffContext.filterLabel,
      filterScope: _handoffContext.filterScope,
      interactionType: _handoffContext.interactionType,
      observedAt: _handoffContext.timestamp
    };
  }

  function buildRunOptions(_actionType, _options, _filterState) {
    var runOptions = Object.assign({}, _options || {}, {
      actionType: _actionType
    });
    if (_actionType === "singleSelect/filterDockStateChanged") {
      runOptions.interactionSequence =
        _guardInteractionFreshness.bumpInteractionSequence(_filterState);
    }
    return runOptions;
  }

  async function handleResolvedInteraction(
    _KDB,
    _runtime,
    _handoffContext,
    _resolved,
    _actionType,
    _options
  ) {
    try {
      var root = _KDB.state.filters.singleSelect;
      if (!_resolved || _resolved.ok !== true) {
        return _diagnostics.recordResolutionFailure(root, _resolved);
      }
      _handoffContext.filterInstanceId = _resolved.filterInstanceId;
      _handoffContext.scopeId = _resolved.scopeId;
      stampLastInteraction(root, _handoffContext, _resolved);
      var filterState = _ensureFilterState(_KDB, _handoffContext);
      var runOptions = buildRunOptions(_actionType, _options, filterState);
      await _runInteractionByIntent.runInteraction(
        _KDB,
        _runtime,
        _handoffContext,
        runOptions
      );
      var draftResult = await _sichtDraftEvents.dispatchAfterInteraction(
        _KDB,
        _handoffContext,
        filterState
      );
      if (draftResult && draftResult.ok === false) {
        _diagnostics.recordDraftFailure(root, draftResult);
        return draftResult;
      }
      return { ok: true };
    } catch (error) {
      console.error("[singleSelect.executeResolvedInteraction] failed", {
        filterInstanceId: _handoffContext &&
          _handoffContext.filterInstanceId || null
      }, error);
      throw error;
    }
  }

  return {
    handleResolvedInteraction: handleResolvedInteraction
  };
});
