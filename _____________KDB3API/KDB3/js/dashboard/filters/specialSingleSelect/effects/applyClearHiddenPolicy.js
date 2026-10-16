define([], function () {
  "use strict";

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
      var clearResult = await _deps.dispatchSpecialPolicy(
        _deps.KDB,
        _deps.buildPolicyPayload(
          _deps.definition,
          "clearHidden",
          _deps.instanceIds,
          null,
          _deps.inventoryGeneration
        ),
        _deps.signal
      );
      var outcome = _deps.readPolicyOutcome(clearResult, _deps.instanceIds);
      outcome.successfulIds.forEach(function (_instanceId) {
        if (parkedCandidates[_instanceId]) {
          parkedSelections[_instanceId] = parkedCandidates[_instanceId];
        }
        selectionSources[_instanceId] = "clearedBySpecialSingleSelect";
      });
      if (!outcome.ok) {
        return _deps.buildFailure(
          outcome.errorCode || _deps.ERROR_CODES.POLICY_APPLY_FAILED,
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
      return _deps.buildFailure(
        _deps.ERROR_CODES.POLICY_APPLY_FAILED,
        _deps.parkedSelections,
        _deps.selectionSources,
        String(_error && _error.message ? _error.message : _error)
      );
    }
  }

  return applyClearHidden;
});
