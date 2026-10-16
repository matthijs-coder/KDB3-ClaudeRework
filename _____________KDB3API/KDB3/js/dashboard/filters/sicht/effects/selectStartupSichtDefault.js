define([
  "../config/sichtDefinitions.js"
], function (_sichtDefinitions) {
  "use strict";

  var OPTION_ORDER = Object.keys(_sichtDefinitions);

  function isAlleDisplayValue(_displayValue) {
    return String(_displayValue || "").trim().toLowerCase() === "alle";
  }

  function isValidStartupCandidate(_optionState) {
    if (!_optionState) {
      return false;
    }
    return (
      _optionState.isVisible === true &&
      _optionState.isEnabled === true &&
      !isAlleDisplayValue(_optionState.displayValue) &&
      String(_optionState.displayValue || "").trim() !== "" &&
      String(_optionState.useValue || "").trim() !== ""
    );
  }

  function selectStartupSichtDefault(_KDB, _byOption) {
    var byOption = _byOption || {};
    var idx;
    var optionKey;
    var optionState;
    for (idx = 0; idx < OPTION_ORDER.length; idx += 1) {
      optionKey = OPTION_ORDER[idx];
      optionState = byOption[optionKey];
      if (isValidStartupCandidate(optionState)) {
        return {
          ok: true,
          selection: {
            displayValue: optionState.displayValue,
            useValue: optionState.useValue
          },
          reason: "firstEnabled"
        };
      }
    }
    return { ok: false, reason: "noEnabledSichtDefault" };
  }

  return selectStartupSichtDefault;
});
