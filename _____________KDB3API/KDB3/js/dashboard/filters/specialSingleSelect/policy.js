define([
  "./config.js",
  "./state.js",
  "./instances.js",
  "../singleSelect/config.js"
], function (_config, _state, _instances, _singleSelectConfig) {
  "use strict";

  var errorCodes = _config.ERROR_CODES;

  async function applyAutomaticSpecialSelection(_KDB, _definition, _filterState, _evaluation, _option, _signal, _syncOptions) {
    try {
      if (_signal && _signal.aborted) {
        return { changed: false, patch: null };
      }
      if (_evaluation.rightsUnknown === true) {
        return { changed: false, patch: null };
      }
      var inventoryGeneration = _syncOptions && _syncOptions.inventoryGeneration;
      var resolved = _instances.resolveLiveSpecialInstances(_KDB, _definition, inventoryGeneration);
      var parkedSelections = _state.cloneParkedSelections(_filterState.parkedSelectionsByInstanceId);
      var selectionSources = _state.cloneSelectionSources(_filterState.selectionSourceByInstanceId);
      if (!resolved.ok) {
        if (resolved.errorCode === errorCodes.INSTANCE_MISSING) {
          parkedSelections = {};
          selectionSources = {};
        }
        return buildFailure(resolved.errorCode, parkedSelections, selectionSources);
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
        return buildFailure(errorCodes.INSTANCE_MISSING, parkedSelections, selectionSources);
      }
      if (_evaluation.shouldClearHidden === true) {
        var clearResult = await applyClearHidden({
          KDB: _KDB,
          definition: _definition,
          instances: instances,
          instanceIds: instanceIds,
          parkedSelections: parkedSelections,
          selectionSources: selectionSources
        });
        if (clearResult && clearResult.patch && !clearResult.patch.errorCode &&
          shouldAttachRestoreClearHint(_evaluation, _definition, _syncOptions, instances)) {
          clearResult.restoreClearHint = { filterLabel: _definition.filterLabel };
        }
        return clearResult;
      }
      if (_evaluation.isVisible === true) {
        var visibleResult = await applyVisiblePolicies({
          KDB: _KDB,
          definition: _definition,
          option: _option,
          evaluation: _evaluation,
          instances: instances,
          instanceIds: instanceIds,
          parkedSelections: parkedSelections,
          selectionSources: selectionSources,
          signal: _signal
        });
        if (visibleResult) {
          if (shouldAttachRestoreDefaultHint(_evaluation, _definition, _syncOptions, visibleResult)) {
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
      return buildFailure(
        errorCodes.POLICY_APPLY_FAILED,
        _state.cloneParkedSelections(_filterState.parkedSelectionsByInstanceId),
        _state.cloneSelectionSources(_filterState.selectionSourceByInstanceId),
        String(_error && _error.message ? _error.message : _error)
      );
    }
  }

  function isNonEmptySelection(_selection) {
    return _selection &&
      _selection.displayValue != null &&
      _selection.useValue != null &&
      String(_selection.useValue) !== "";
  }

  async function applyClearHidden(_deps) {
    try {
      var parkedSelections = _deps.parkedSelections;
      var selectionSources = _deps.selectionSources;
      var parkedCandidates = {};
      _deps.instances.forEach(function (_entry) {
        if (selectionSources[_entry.filterInstanceId] === "user" &&
          isNonEmptySelection(_entry)) {
          parkedCandidates[_entry.filterInstanceId] = {
            displayValue: _entry.displayValue,
            useValue: _entry.useValue,
            parkedAt: Date.now()
          };
        }
      });
      var clearResult = await dispatchSpecialPolicy(
        _deps.KDB,
        buildPolicyPayload(_deps.definition, "clearHidden", _deps.instanceIds, null)
      );
      var outcome = readPolicyOutcome(clearResult, _deps.instanceIds);
      outcome.successfulIds.forEach(function (_instanceId) {
        if (parkedCandidates[_instanceId]) {
          parkedSelections[_instanceId] = parkedCandidates[_instanceId];
        }
        selectionSources[_instanceId] = "clearedBySpecialSingleSelect";
      });
      if (!outcome.ok) {
        return buildFailure(
          outcome.errorCode || errorCodes.POLICY_APPLY_FAILED,
          parkedSelections,
          selectionSources
        );
      }
      return {
        changed: true,
        patch: {
          selectionSource: "clearedBySpecialSingleSelect",
          selectionSourceByInstanceId: selectionSources,
          wasSetBySpecialSingleSelect: false,
          parkedSelectionsByInstanceId: parkedSelections,
          lastPolicyAppliedAt: Date.now(),
          errorCode: null,
          errorMessage: null
        }
      };
    } catch (_error) {
      console.error("[specialSingleSelect.applyClearHiddenPolicy] failed", _error);
      return buildFailure(
        errorCodes.POLICY_APPLY_FAILED,
        _deps.parkedSelections,
        _deps.selectionSources,
        String(_error && _error.message ? _error.message : _error)
      );
    }
  }

  function isValidSelection(_selection) {
    return _selection && _selection.displayValue != null && _selection.useValue != null;
  }

  function isUnselected(_instance) {
    return !_instance || _instance.useValue == null || String(_instance.useValue).trim() === "";
  }

  function buildAppliedPatch(_deps, _source, _wasSetByOwner) {
    return {
      changed: true,
      patch: {
        selectionSource: _source,
        selectionSourceByInstanceId: _deps.selectionSources,
        wasSetBySpecialSingleSelect: _wasSetByOwner,
        parkedSelectionsByInstanceId: _deps.parkedSelections,
        lastPolicyAppliedAt: Date.now(),
        errorCode: null,
        errorMessage: null
      }
    };
  }

  // Resolves with { result } when the visible policy is finished early, else { restoreApplied }.
  async function restoreParkedSelections(_deps, _parkedIds) {
    var restoreApplied = false;
    var i;
    for (i = 0; i < _parkedIds.length; i += 1) {
      var parked = _deps.parkedSelections[_parkedIds[i]];
      if (!isValidSelection(parked)) {
        return {
          result: buildFailure(errorCodes.PARKED_SELECTION_INVALID, _deps.parkedSelections, _deps.selectionSources)
        };
      }
      var restoreResult = await dispatchSpecialPolicy(
        _deps.KDB,
        buildPolicyPayload(_deps.definition, "restoreParked", [_parkedIds[i]], parked)
      );
      var restoreOutcome = readPolicyOutcome(restoreResult, [_parkedIds[i]]);
      if (restoreOutcome.successfulIds.length) {
        _deps.selectionSources[_parkedIds[i]] = "user";
        delete _deps.parkedSelections[_parkedIds[i]];
        restoreApplied = true;
      }
      if (!restoreOutcome.ok) {
        return {
          result: buildFailure(
            restoreOutcome.errorCode || errorCodes.POLICY_APPLY_FAILED,
            _deps.parkedSelections,
            _deps.selectionSources
          )
        };
      }
      if (_deps.signal && _deps.signal.aborted) {
        return { result: buildAppliedPatch(_deps, "user", false) };
      }
    }
    return { restoreApplied: restoreApplied };
  }

  async function applyVisiblePolicies(_deps) {
    try {
      var parkedIds = Object.keys(_deps.parkedSelections).filter(function (_instanceId) {
        return _deps.instanceIds.indexOf(_instanceId) !== -1;
      });
      var instancesById = {};
      _deps.instances.forEach(function (_instance) {
        instancesById[_instance.filterInstanceId] = _instance;
      });
      var defaultIds = _deps.instanceIds.filter(function (_instanceId) {
        return parkedIds.indexOf(_instanceId) === -1 &&
          isUnselected(instancesById[_instanceId]);
      });
      var restored = await restoreParkedSelections(_deps, parkedIds);
      if (restored.result) {
        return restored.result;
      }
      if (_deps.evaluation.shouldApplyDefault === true && _deps.option && defaultIds.length) {
        var defaultResult = await dispatchSpecialPolicy(
          _deps.KDB,
          buildPolicyPayload(_deps.definition, "applyDefault", defaultIds, {
            displayValue: _deps.option.display,
            useValue: _deps.option.use
          })
        );
        var defaultOutcome = readPolicyOutcome(defaultResult, defaultIds);
        defaultOutcome.successfulIds.forEach(function (_instanceId) {
          _deps.selectionSources[_instanceId] = "specialDefault";
        });
        if (!defaultOutcome.ok) {
          return buildFailure(
            defaultOutcome.errorCode || errorCodes.POLICY_APPLY_FAILED,
            _deps.parkedSelections,
            _deps.selectionSources
          );
        }
        return buildAppliedPatch(_deps, "specialDefault", true);
      }
      if (!restored.restoreApplied) {
        return null;
      }
      return buildAppliedPatch(_deps, "user", false);
    } catch (_error) {
      console.error("[specialSingleSelect.applyVisiblePolicies] failed", _error);
      return buildFailure(
        errorCodes.POLICY_APPLY_FAILED,
        _deps.parkedSelections,
        _deps.selectionSources,
        String(_error && _error.message ? _error.message : _error)
      );
    }
  }

  function buildPolicyPayload(_definition, _operation, _instanceIds, _selection) {
    var payload = {
      semanticSpecialFilterId: _definition.filterId,
      filterInstanceIds: _instanceIds,
      operation: _operation,
      source: "specialSingleSelect",
      skipHistory: true
    };
    if (_selection) {
      payload.selection = {
        displayValue: _selection.displayValue,
        useValue: _selection.useValue
      };
    }
    return payload;
  }

  function readPolicyOutcome(_result, _instanceIds) {
    var applied = _result && Array.isArray(_result.applied) ? _result.applied : [];
    var appliedById = {};
    var successfulIds = [];
    var failedIds = [];
    var errorCode = null;
    var idx;
    for (idx = 0; idx < applied.length; idx += 1) {
      if (applied[idx] && applied[idx].filterInstanceId) {
        appliedById[applied[idx].filterInstanceId] = applied[idx];
      }
    }
    for (idx = 0; idx < _instanceIds.length; idx += 1) {
      var instanceId = _instanceIds[idx];
      var result = appliedById[instanceId];
      if (result && result.ok === true) {
        successfulIds.push(instanceId);
      } else {
        failedIds.push(instanceId);
        errorCode = errorCode ||
          (result && result.errorCode) ||
          errorCodes.POLICY_APPLY_FAILED;
      }
    }
    return {
      ok: failedIds.length === 0 && _result && _result.ok === true,
      successfulIds: successfulIds,
      failedIds: failedIds,
      errorCode: errorCode
    };
  }

  async function dispatchSpecialPolicy(_KDB, _payload) {
    var api = _KDB && _KDB.api ? _KDB.api.singleSelect : null;
    if (!api || typeof api.dispatch !== "function") {
      return { ok: false };
    }
    return api.dispatch({
      type: _singleSelectConfig.actions.APPLY_SPECIAL_SELECTION_POLICY,
      payload: _payload
    });
  }

  function buildFailure(_errorCode, _parkedSelections, _selectionSources, _message) {
    return {
      changed: false,
      patch: {
        parkedSelectionsByInstanceId: _parkedSelections || {},
        selectionSourceByInstanceId: _selectionSources || {},
        errorCode: _errorCode,
        errorMessage: _message || _errorCode
      }
    };
  }

  function isNonEmptyInstance(_entry) {
    return !!(_entry && _entry.displayValue != null && _entry.useValue != null && String(_entry.useValue) !== "");
  }

  function isSpecialRestoreFilterLabel(_definition) {
    return !!(_definition && _config.DEFINITIONS_BY_LABEL[_definition.filterLabel]);
  }

  function shouldAttachRestoreClearHint(_evaluation, _definition, _syncOptions, _instances) {
    return !!(_syncOptions && _syncOptions.reason === "parameterRestore"
      && isSpecialRestoreFilterLabel(_definition)
      && _evaluation && _evaluation.rightsUnknown !== true
      && _evaluation.rightAllowed === false
      && Array.isArray(_instances) && _instances.some(isNonEmptyInstance));
  }

  function shouldAttachRestoreDefaultHint(_evaluation, _definition, _syncOptions, _visibleResult) {
    var patch = _visibleResult && _visibleResult.patch;
    return !!(_syncOptions && _syncOptions.reason === "parameterRestore"
      && isSpecialRestoreFilterLabel(_definition)
      && _evaluation && _evaluation.rightsUnknown !== true
      && _evaluation.rightAllowed === true
      && _visibleResult && _visibleResult.changed
      && patch && patch.selectionSource === "specialDefault"
      && !patch.errorCode);
  }

  return {
    applyAutomaticSpecialSelection: applyAutomaticSpecialSelection
  };
});
