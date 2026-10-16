define([
  "../effects/resolveDelegatedSichtInstanceId.js",
  "../effects/dispatchSingleSelectOwnerSelection.js",
  "../effects/buildSichtOperationId.js",
  "../effects/readSingleSelectInventoryGeneration.js"
], function (
  _resolveDelegatedSichtInstanceId,
  _dispatchSingleSelectOwnerSelection,
  _buildSichtOperationId,
  _readInventoryGeneration
) {
  "use strict";

  // Legacy steps may lack useValue; resolve it from the current byOption
  // mapping. New-format steps already carry both values inside old/new.
  function resolveReplaySelection(_KDB, _targetValue) {
    var displayValue =
      _targetValue && _targetValue.displayValue != null ? String(_targetValue.displayValue) : "";
    var useValue = _targetValue && _targetValue.useValue != null ? String(_targetValue.useValue) : "";
    var byOption;
    var keys;
    var idx;
    var optionState;
    if (!displayValue) {
      return null;
    }
    if (!useValue) {
      byOption =
        _KDB && _KDB.state && _KDB.state.filters && _KDB.state.filters.sicht
          ? _KDB.state.filters.sicht.byOption
          : null;
      keys = byOption && typeof byOption === "object" ? Object.keys(byOption) : [];
      for (idx = 0; idx < keys.length; idx += 1) {
        optionState = byOption[keys[idx]];
        if (optionState && optionState.displayValue === displayValue && optionState.useValue) {
          useValue = String(optionState.useValue);
          break;
        }
      }
    }
    return { displayValue: displayValue, useValue: useValue };
  }

  async function replayDienststelleDependency(_KDB, _targetValue, _step) {
    try {
      var dependencies = _targetValue && _targetValue.dependencies
        ? _targetValue.dependencies
        : (_step && _step.dependencies ? _step.dependencies : null);
      if (!dependencies || !dependencies.dienststelle) {
        return true;
      }
      if (!_KDB.api.dienststelle || typeof _KDB.api.dienststelle.dispatch !== "function") {
        console.warn("[sicht.historyReplay] dienststelle API unavailable for dependency replay");
        return false;
      }
      return (await _KDB.api.dienststelle.dispatch({
        type: "dienststelle/historyReplayRequested",
        payload: {
          targetValue: dependencies.dienststelle,
          step: _step,
          source: "sichtHistoryReplay"
        }
      })) === true;
    } catch (error) {
      console.error("[sicht.historyReplay] dienststelle replay failed", error);
      return false;
    }
  }

  // Never writes singleSelect or Cognos state directly (contract §8): replay
  // resolves the one live global Sicht instance and delegates through the
  // certified singleSelect/applyOwnerSelection action.
  async function apply(_KDB, _targetValue, _step) {
    try {
      var step = _step || {};
      var selection = resolveReplaySelection(_KDB, _targetValue);
      var filterInstanceId;
      var inventoryGeneration;
      var result;
      if (step.key !== "filter_sicht" || !selection) {
        return false;
      }
      filterInstanceId = _resolveDelegatedSichtInstanceId(_KDB, _targetValue);
      if (!filterInstanceId) {
        console.warn("[sicht.historyReplay] no unique live global Sicht instance for replay");
        return false;
      }
      inventoryGeneration = _readInventoryGeneration(_KDB);
      if (inventoryGeneration == null) {
        console.warn("[sicht.historyReplay] singleSelect inventory is not ready");
        return false;
      }
      result = await _dispatchSingleSelectOwnerSelection(_KDB, {
        filterInstanceId: filterInstanceId,
        operationId: _buildSichtOperationId("historyReplay"),
        selection: selection,
        source: "historyReplay",
        inventoryGeneration: inventoryGeneration
      });
      if (!result || result.ok !== true) {
        return false;
      }
      if (!await replayDienststelleDependency(_KDB, _targetValue, step)) {
        console.warn("[sicht.historyReplay] dienststelle replay degraded after Sicht commit");
      }
      return true;
    } catch (error) {
      console.error("[sicht.historyReplay] apply failed", error);
      return false;
    }
  }

  return { apply: apply };
});
