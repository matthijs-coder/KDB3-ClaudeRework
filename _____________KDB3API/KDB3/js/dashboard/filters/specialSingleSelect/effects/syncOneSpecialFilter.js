define([
  "../config/actions.js",
  "./readSpecialRightsFromTableData.js",
  "./readDefaultOptionFromTableData.js",
  "./evaluateSpecialFilterVisibility.js",
  "./syncSpecialFilterClasses.js",
  "./applyAutomaticSpecialSelection.js"
], function (
  _actions,
  _readSpecialRightsFromTableData,
  _readDefaultOptionFromTableData,
  _evaluateSpecialFilterVisibility,
  _syncSpecialFilterClasses,
  _applyAutomaticSpecialSelection
) {
  "use strict";

  function resolveFilterKey(_definition, _filterState) {
    if (_filterState && _filterState.filterKey) {
      return _filterState.filterKey;
    }
    return "global__" + _definition.filterLabel;
  }

  async function syncOneSpecialFilter(
    _controller,
    _dispatchInternal,
    _filterId,
    _definition,
    _alleRead,
    _signal,
    _syncOptions
  ) {
    try {
      var filterState =
        (_controller._KDB.state.filters.specialSingleSelect.byFilterId[_filterId]) || {};
      var filterKey = resolveFilterKey(_definition, filterState);
      var rightRead = _readSpecialRightsFromTableData.readRightFromTableData(
        _controller._KDB,
        _definition.rightTableKey
      );
      var optionRead = _readDefaultOptionFromTableData.readFirstValidOptionRow(
        _controller._KDB,
        _definition.optionTableKey
      );
      var currentRoot = _controller._KDB.state.filters.specialSingleSelect;
      var currentFilterState = currentRoot.byFilterId[_filterId] || {};
      var stateWithKey = Object.assign({}, currentFilterState, { filterKey: filterKey });
      var evaluation = _evaluateSpecialFilterVisibility.evaluateSpecialFilterVisibility(_definition, {
        alleKnown: _alleRead.known,
        alleAllowed: _alleRead.allowed,
        rightKnown: rightRead.known,
        rightAllowed: rightRead.allowed,
        activeSichtValue: currentRoot.activeSichtValue,
        hasDefaultOption: optionRead.known === true && optionRead.option != null
      });
      var patch = {
        filterKey: filterKey,
        alleAllowed: evaluation.alleAllowed,
        rightAllowed: evaluation.rightAllowed,
        isVisibleForSicht: evaluation.isVisibleForSicht,
        isVisible: evaluation.isVisible,
        lastSyncedAt: Date.now(),
        errorCode: null,
        errorMessage: null
      };
      var cognosResult;
      var classEvaluation;
      var policyReady;

      if (_controller.isDisposed || (_signal && _signal.aborted)) {
        return { filterId: _filterId, ok: false, aborted: true };
      }

      cognosResult = await _applyAutomaticSpecialSelection.applyAutomaticSpecialSelection(
        _controller._KDB,
        _definition,
        stateWithKey,
        evaluation,
        optionRead.option,
        _signal,
        _syncOptions || {}
      );
      if (_controller.isDisposed) {
        return { filterId: _filterId, ok: false, aborted: true };
      }
      if (cognosResult.patch) {
        patch = Object.assign(patch, cognosResult.patch);
      }
      policyReady = !!cognosResult.patch &&
        !cognosResult.patch.errorCode &&
        (evaluation.alleAllowed === true || evaluation.shouldApplyDefault === true);
      classEvaluation = evaluation;
      if (evaluation.isVisible === true && !policyReady) {
        classEvaluation = Object.assign({}, evaluation, {
          rightAllowed: false,
          isVisible: false
        });
        patch.isVisible = false;
      }
      _syncSpecialFilterClasses.syncSpecialFilterClasses(
        _controller.runtime,
        _filterId,
        _definition,
        classEvaluation
      );
      if (_controller.isDisposed) {
        return { filterId: _filterId, ok: false, aborted: true };
      }
      _dispatchInternal(_controller, {
        type: _actions.SYNC_FILTER_EVALUATED,
        payload: { filterId: _filterId, patch: patch }
      });
      return {
        filterId: _filterId,
        ok: !patch.errorCode,
        superseded: !!(_signal && _signal.aborted),
        errorCode: patch.errorCode || null,
        errorMessage: patch.errorMessage || null,
        restoreClearHint: cognosResult && cognosResult.restoreClearHint ? cognosResult.restoreClearHint : null,
        restoreDefaultHint: cognosResult && cognosResult.restoreDefaultHint ? cognosResult.restoreDefaultHint : null
      };
    } catch (err) {
      console.error("[specialSingleSelect.syncOneSpecialFilter] failed", err);
      throw err;
    }
  }

  return {
    syncOneSpecialFilter: syncOneSpecialFilter
  };
});
