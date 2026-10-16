define([
  "./state/selectors.js",
  "./operations.js",
  "./delegation.js",
  "../singleSelect/selectors.js",
  "../dienststelle/selectors.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/history.js"
], function (_selectors, _operations, _delegation, _singleSelectSelectors, _dienststelleSelectors, _kitData, _kitHistory) {
  "use strict";

  var STEP_KEY = "filter_sicht";

  function createSichtReplayHandler() {
    var applyByKey = {};
    applyByKey[STEP_KEY] = applyReplay;
    return _kitHistory.createReplayHandler(applyByKey);
  }

  // Never writes singleSelect or Cognos state directly: replay resolves the one
  // live global Sicht instance and delegates through singleSelect/applyOwnerSelection.
  async function applyReplay(_KDB, _targetValue, _step) {
    try {
      var step = _step || {};
      var selection = resolveReplaySelection(_KDB, _targetValue);
      var filterInstanceId;
      var inventoryGeneration;
      var result;
      if (!selection) {
        return false;
      }
      filterInstanceId = _delegation.resolveDelegatedSichtInstanceId(_KDB, _targetValue);
      if (!filterInstanceId) {
        console.warn("[sicht.historyReplay] no unique live global Sicht instance for replay");
        return false;
      }
      inventoryGeneration = _delegation.readSingleSelectInventoryGeneration(_KDB);
      if (inventoryGeneration == null) {
        console.warn("[sicht.historyReplay] singleSelect inventory is not ready");
        return false;
      }
      result = await _delegation.dispatchSingleSelectOwnerSelection(_KDB, {
        filterInstanceId: filterInstanceId,
        operationId: _operations.buildSichtOperationId("historyReplay"),
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

  // Legacy steps may lack useValue; resolve it from the current byOption
  // mapping. New-format steps already carry both values inside old/new.
  function resolveReplaySelection(_KDB, _targetValue) {
    var displayValue =
      _targetValue && _targetValue.displayValue != null ? String(_targetValue.displayValue) : "";
    var useValue = _targetValue && _targetValue.useValue != null ? String(_targetValue.useValue) : "";
    var state;
    var option;
    if (!displayValue) {
      return null;
    }
    if (!useValue) {
      state = _selectors.readSichtState(_KDB);
      option = _selectors.findOptionByDisplay(state && state.byOption, displayValue);
      if (option && option.useValue) {
        useValue = String(option.useValue);
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
        type: _dienststelleSelectors.actionTypes.HISTORY_REPLAY_REQUESTED,
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

  // Snapshots are copies: the history step keeps them after the dependency states change.
  function readDependencySnapshots(_KDB) {
    var specialSingleSelectApi =
      _KDB && _KDB.api && _KDB.api.specialSingleSelect ? _KDB.api.specialSingleSelect : null;
    var dienststelleApi = _KDB && _KDB.api && _KDB.api.dienststelle ? _KDB.api.dienststelle : null;
    var specialSingleSelect = null;
    var dienststelle = null;
    if (specialSingleSelectApi && typeof specialSingleSelectApi.getState === "function") {
      specialSingleSelect = _kitData.cloneJson(specialSingleSelectApi.getState());
    }
    if (dienststelleApi && typeof dienststelleApi.getState === "function") {
      dienststelle = _kitData.cloneJson(dienststelleApi.getState());
    }
    return {
      specialSingleSelect: specialSingleSelect,
      dienststelle: dienststelle
    };
  }

  // Enriches a history step value with the live singleSelect identity tuple.
  // Falls back to global/no-instance defaults when the instance is unknown.
  function readSichtInstanceIdentity(_KDB, _filterInstanceId) {
    var record = _filterInstanceId ? _singleSelectSelectors.readFilterInstance(_KDB, _filterInstanceId) : null;
    return {
      filterInstanceId: record ? record.filterInstanceId : (_filterInstanceId || null),
      scopeType: record ? record.scopeType : "global",
      scopeId: record ? record.scopeId : "global",
      itemId: record ? record.itemId : null,
      semanticInstanceKey: record ? record.semanticInstanceKey : null
    };
  }

  // dependencies is not a top-level history-step field; it is duplicated inside
  // both old and new value shapes alongside identity and the display/use pair.
  function buildCommittedStep(
    _previousSelection,
    _nextSelection,
    _oldDependencies,
    _newDependencies,
    _identity
  ) {
    return {
      key: STEP_KEY,
      timestamp: Date.now(),
      old: buildStepValue(_previousSelection, _identity, buildDependencies(_oldDependencies)),
      new: buildStepValue(_nextSelection, _identity, buildDependencies(_newDependencies))
    };
  }

  function buildDependencies(_dependencies) {
    return {
      specialSingleSelect: _dependencies && _dependencies.specialSingleSelect != null
        ? _dependencies.specialSingleSelect : null,
      dienststelle: _dependencies && _dependencies.dienststelle != null
        ? _dependencies.dienststelle : null
    };
  }

  function buildStepValue(_selection, _identity, _dependencies) {
    var identity = _identity || {};
    var displayValue =
      _selection && _selection.displayValue != null ? String(_selection.displayValue) : "";
    var useValue = _selection && _selection.useValue != null ? String(_selection.useValue) : "";
    return {
      filterInstanceId: identity.filterInstanceId || null,
      scopeType: identity.scopeType || "global",
      scopeId: identity.scopeId || "global",
      itemId: identity.itemId != null ? identity.itemId : null,
      semanticInstanceKey: identity.semanticInstanceKey != null ? identity.semanticInstanceKey : null,
      displayValue: displayValue,
      useValue: useValue,
      activeSichtValue: displayValue,
      dependencies: _dependencies
    };
  }

  return {
    createSichtReplayHandler: createSichtReplayHandler,
    readDependencySnapshots: readDependencySnapshots,
    readSichtInstanceIdentity: readSichtInstanceIdentity,
    buildCommittedStep: buildCommittedStep
  };
});
