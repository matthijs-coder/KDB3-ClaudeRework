define([], function () {
  "use strict";

  function normalizeSichtValue(_value) {
    return _value == null ? "" : String(_value).trim();
  }

  function isSichtCompatible(_definition, _activeSichtValue) {
    var allowed = _definition && Array.isArray(_definition.allowedSichtValues)
      ? _definition.allowedSichtValues
      : [];
    var active = normalizeSichtValue(_activeSichtValue);
    if (!active) {
      return false;
    }
    return allowed.indexOf(active) !== -1;
  }

  function evaluateSpecialFilterVisibility(_definition, _inputs) {
    var alleKnown = _inputs.alleKnown === true;
    var alleAllowed = _inputs.alleAllowed === true;
    var rightKnown = _inputs.rightKnown === true;
    var rightAllowed = _inputs.rightAllowed === true;
    var activeSichtValue = normalizeSichtValue(_inputs.activeSichtValue);
    var isVisibleForSicht = isSichtCompatible(_definition, activeSichtValue);
    var isVisible = rightKnown && rightAllowed && isVisibleForSicht;
    var shouldApplyDefault =
      isVisible &&
      alleKnown &&
      !alleAllowed &&
      _inputs.hasDefaultOption === true;
    var shouldClearHidden =
      rightKnown &&
      (!rightAllowed || (activeSichtValue && !isVisibleForSicht));
    var rightsUnknown = !alleKnown || !rightKnown;
    return {
      alleAllowed: alleAllowed,
      rightAllowed: rightAllowed,
      isVisibleForSicht: isVisibleForSicht,
      isVisible: isVisible,
      shouldApplyDefault: shouldApplyDefault,
      shouldClearHidden: shouldClearHidden,
      rightsUnknown: rightsUnknown
    };
  }

  return {
    evaluateSpecialFilterVisibility: evaluateSpecialFilterVisibility,
    isSichtCompatible: isSichtCompatible
  };
});
