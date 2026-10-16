define([
  "../config/actions.js",
  "./readSichtAvailabilityFromTableData.js",
  "./evaluateSichtOptions.js"
], function (_actions, _readSichtAvailabilityFromTableData, _evaluateSichtOptions) {
  "use strict";

  function evaluateAndStoreSichtOptions(_KDB, _dispatchInternal) {
    var availability = _readSichtAvailabilityFromTableData(_KDB);
    var evaluated = _evaluateSichtOptions(_KDB, availability);
    _dispatchInternal({
      type: _actions.SYNC_OPTIONS_EVALUATED,
      payload: { byOption: evaluated.byOption, evaluatedAt: evaluated.evaluatedAt }
    });
    return evaluated.byOption;
  }

  return evaluateAndStoreSichtOptions;
});
