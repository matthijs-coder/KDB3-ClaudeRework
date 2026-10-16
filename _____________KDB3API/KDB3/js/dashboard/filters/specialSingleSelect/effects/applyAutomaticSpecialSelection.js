define([
  "./specialPolicyShared.js",
  "./specialPolicyApplyOps.js",
  "./applyClearHiddenPolicy.js"
], function (_shared, _ops, _applyClearHiddenPolicy) {
  "use strict";

  async function applyAutomaticSpecialSelection(_KDB, _definition, _filterState, _evaluation, _option, _signal, _syncOptions) {
    try {
      if (_signal && _signal.aborted) {
        return { changed: false, patch: null };
      }
      if (_evaluation.rightsUnknown === true) {
        return { changed: false, patch: null };
      }
      var inventoryGeneration = _syncOptions && _syncOptions.inventoryGeneration;
      var resolved = _shared.readLiveSpecialInstances(_KDB, _definition, inventoryGeneration);
      var parkedSelections = _shared.cloneParkedSelections(_filterState.parkedSelectionsByInstanceId);
      var selectionSources = _shared.cloneSelectionSources(_filterState.selectionSourceByInstanceId);
      if (!resolved.ok) {
        if (resolved.errorCode === _shared.ERROR_CODES.INSTANCE_MISSING) {
          parkedSelections = {};
          selectionSources = {};
        }
        return _shared.buildFailure(
          resolved.errorCode,
          parkedSelections,
          selectionSources
        );
      }
      var instances = resolved.items || [];
      var instanceIds = instances.map(function (_entry) { return _entry.filterInstanceId; });
      Object.keys(parkedSelections).forEach(function (_instanceId) {
        if (instanceIds.indexOf(_instanceId) === -1) {
          delete parkedSelections[_instanceId];
        }
      });
      Object.keys(selectionSources).forEach(function (_instanceId) {
        if (instanceIds.indexOf(_instanceId) === -1) {
          delete selectionSources[_instanceId];
        }
      });
      if (!instanceIds.length) {
        return _shared.buildFailure(
          _shared.ERROR_CODES.INSTANCE_MISSING,
          parkedSelections,
          selectionSources
        );
      }
      if (_evaluation.shouldClearHidden === true) {
        var clearResult = await _applyClearHiddenPolicy({
          KDB: _KDB,
          definition: _definition,
          filterState: _filterState,
          instances: instances,
          instanceIds: instanceIds,
          parkedSelections: parkedSelections,
          selectionSources: selectionSources,
          inventoryGeneration: inventoryGeneration,
          signal: _signal,
          ERROR_CODES: _shared.ERROR_CODES,
          dispatchSpecialPolicy: _shared.dispatchSpecialPolicy,
          buildPolicyPayload: _shared.buildPolicyPayload,
          readPolicyOutcome: _shared.readPolicyOutcome,
          buildFailure: _shared.buildFailure
        });
        if (clearResult && clearResult.patch && !clearResult.patch.errorCode &&
          _shared.shouldAttachRestoreClearHint(_evaluation, _definition, _syncOptions, instances)) {
          clearResult.restoreClearHint = { filterLabel: _definition.filterLabel };
        }
        return clearResult;
      }
      if (_evaluation.isVisible === true) {
        var visibleResult = await _ops.applyVisiblePolicies({
          KDB: _KDB,
          definition: _definition,
          option: _option,
          evaluation: _evaluation,
          instances: instances,
          instanceIds: instanceIds,
          parkedSelections: parkedSelections,
          selectionSources: selectionSources,
          inventoryGeneration: inventoryGeneration,
          signal: _signal,
          ERROR_CODES: _shared.ERROR_CODES,
          dispatchSpecialPolicy: _shared.dispatchSpecialPolicy,
          buildPolicyPayload: _shared.buildPolicyPayload,
          readPolicyOutcome: _shared.readPolicyOutcome,
          buildFailure: _shared.buildFailure
        });
        if (visibleResult) {
          if (_shared.shouldAttachRestoreDefaultHint(_evaluation, _definition, _syncOptions, visibleResult)) {
            visibleResult.restoreDefaultHint = { filterLabel: _definition.filterLabel };
          }
          return visibleResult;
        }
      }
      return {
        changed: false,
        patch: {
          parkedSelectionsByInstanceId: parkedSelections,
          selectionSourceByInstanceId: selectionSources,
          errorCode: null,
          errorMessage: null
        }
      };
    } catch (_error) {
      console.error("[specialSingleSelect.applyAutomaticSpecialSelection] failed", _error);
      return _shared.buildFailure(
        _shared.ERROR_CODES.POLICY_APPLY_FAILED,
        _shared.cloneParkedSelections(_filterState.parkedSelectionsByInstanceId),
        _shared.cloneSelectionSources(_filterState.selectionSourceByInstanceId),
        String(_error && _error.message ? _error.message : _error)
      );
    }
  }

  return {
    applyAutomaticSpecialSelection: applyAutomaticSpecialSelection
  };
});
