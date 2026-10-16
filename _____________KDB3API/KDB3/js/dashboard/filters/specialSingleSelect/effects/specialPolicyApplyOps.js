define([], function () {
  "use strict";

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
      var restoreApplied = false;
      var i;
      for (i = 0; i < parkedIds.length; i += 1) {
        var parked = _deps.parkedSelections[parkedIds[i]];
        if (!isValidSelection(parked)) {
          return _deps.buildFailure(
            _deps.ERROR_CODES.PARKED_SELECTION_INVALID,
            _deps.parkedSelections,
            _deps.selectionSources
          );
        }
        var restoreResult = await _deps.dispatchSpecialPolicy(
          _deps.KDB,
          _deps.buildPolicyPayload(
            _deps.definition,
            "restoreParked",
            [parkedIds[i]],
            parked,
            _deps.inventoryGeneration
          ),
          _deps.signal
        );
        var restoreOutcome = _deps.readPolicyOutcome(restoreResult, [parkedIds[i]]);
        if (restoreOutcome.successfulIds.length) {
          _deps.selectionSources[parkedIds[i]] = "user";
          delete _deps.parkedSelections[parkedIds[i]];
          restoreApplied = true;
        }
        if (!restoreOutcome.ok) {
          return _deps.buildFailure(
            restoreOutcome.errorCode || _deps.ERROR_CODES.POLICY_APPLY_FAILED,
            _deps.parkedSelections,
            _deps.selectionSources
          );
        }
        if (_deps.signal && _deps.signal.aborted) {
          return buildAppliedPatch(_deps, "user", false);
        }
      }
      if (_deps.evaluation.shouldApplyDefault === true && _deps.option && defaultIds.length) {
        var defaultResult = await _deps.dispatchSpecialPolicy(
          _deps.KDB,
          _deps.buildPolicyPayload(
            _deps.definition,
            "applyDefault",
            defaultIds,
            {
              displayValue: _deps.option.display,
              useValue: _deps.option.use
            },
            _deps.inventoryGeneration
          ),
          _deps.signal
        );
        var defaultOutcome = _deps.readPolicyOutcome(defaultResult, defaultIds);
        defaultOutcome.successfulIds.forEach(function (_instanceId) {
          _deps.selectionSources[_instanceId] = "specialDefault";
        });
        if (!defaultOutcome.ok) {
          return _deps.buildFailure(
            defaultOutcome.errorCode || _deps.ERROR_CODES.POLICY_APPLY_FAILED,
            _deps.parkedSelections,
            _deps.selectionSources
          );
        }
        return buildAppliedPatch(_deps, "specialDefault", true);
      }
      if (!restoreApplied) {
        return null;
      }
      return buildAppliedPatch(_deps, "user", false);
    } catch (_error) {
      console.error("[specialSingleSelect.applyVisiblePolicies] failed", _error);
      return _deps.buildFailure(
        _deps.ERROR_CODES.POLICY_APPLY_FAILED,
        _deps.parkedSelections,
        _deps.selectionSources,
        String(_error && _error.message ? _error.message : _error)
      );
    }
  }

  return {
    applyVisiblePolicies: applyVisiblePolicies
  };
});
