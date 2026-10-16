define([], function () {
  "use strict";

  function cloneSnapshot(_value) {
    if (_value == null) {
      return null;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (error) {
      console.error("[sicht.buildCommittedStep] dependency clone failed", error);
      return null;
    }
  }

  function buildDependencies(_dependencies) {
    return {
      specialSingleSelect: cloneSnapshot(
        _dependencies && _dependencies.specialSingleSelect
      ),
      dienststelle: cloneSnapshot(
        _dependencies && _dependencies.dienststelle
      )
    };
  }

  // Contract §8: dependencies is not a top-level history-step field; it is
  // duplicated inside both old and new value shapes alongside identity/d/u.
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

  function buildCommittedStep(
    _previousSelection,
    _nextSelection,
    _oldDependencies,
    _newDependencies,
    _identity
  ) {
    try {
      return {
        key: "filter_sicht",
        timestamp: Date.now(),
        old: buildStepValue(
          _previousSelection,
          _identity,
          buildDependencies(_oldDependencies)
        ),
        new: buildStepValue(
          _nextSelection,
          _identity,
          buildDependencies(_newDependencies)
        )
      };
    } catch (error) {
      console.error("[sicht.buildCommittedStep] failed", error);
      throw error;
    }
  }

  return buildCommittedStep;
});
