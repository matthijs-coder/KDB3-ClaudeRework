define([
  "../config/errorCodes.js",
  "./resolveLiveSpecialInstances.js"
], function (_errorCodes, _resolveLiveSpecialInstances) {
  "use strict";

  function cloneParkedSelections(_entries) {
    var source = _entries || {};
    var next = {};
    Object.keys(source).forEach(function (_instanceId) {
      if (source[_instanceId]) {
        next[_instanceId] = Object.assign({}, source[_instanceId]);
      }
    });
    return next;
  }

  function cloneSelectionSources(_entries) {
    return Object.assign({}, _entries || {});
  }

  function buildPolicyPayload(_definition, _operation, _instanceIds, _selection, _inventoryGeneration) {
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
          _errorCodes.POLICY_APPLY_FAILED;
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
      type: "singleSelect/applySpecialSelectionPolicy",
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
    return !!(_definition && (_definition.filterLabel === "Personengruppe"
      || _definition.filterLabel === "Dienststellenleitung"));
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
    ERROR_CODES: _errorCodes,
    cloneParkedSelections: cloneParkedSelections,
    cloneSelectionSources: cloneSelectionSources,
    readLiveSpecialInstances: _resolveLiveSpecialInstances,
    buildPolicyPayload: buildPolicyPayload,
    readPolicyOutcome: readPolicyOutcome,
    dispatchSpecialPolicy: dispatchSpecialPolicy,
    buildFailure: buildFailure,
    shouldAttachRestoreClearHint: shouldAttachRestoreClearHint,
    shouldAttachRestoreDefaultHint: shouldAttachRestoreDefaultHint
  };
});
