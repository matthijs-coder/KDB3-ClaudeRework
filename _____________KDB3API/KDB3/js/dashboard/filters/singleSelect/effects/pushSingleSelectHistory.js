define(["../history/buildCommittedStep.js"], function (_buildCommittedStep) {
  "use strict";

  // Generic history stays excluded for delegated Sicht and automatic special
  // policy (skipHistory: true); visible special user commits retain it
  // (singleSelect-filterInstanceIdentity-contractdelta.md §7.3/§6.1).
  function pushGenericHistory(_KDB, _handoffContext, _previousSelection, _nextSelection) {
    var history;
    var step;
    if (
      !_handoffContext ||
      _handoffContext.filterType === "sicht" ||
      _handoffContext.skipHistory === true
    ) {
      return;
    }
    step = _buildCommittedStep(_KDB, _handoffContext, _previousSelection, _nextSelection);
    if (!step) {
      return;
    }
    history = _KDB.services && _KDB.services.history;
    if (history && typeof history.pushCommittedStep === "function") {
      history.pushCommittedStep(step);
    }
  }

  return {
    pushGenericHistory: pushGenericHistory
  };
});
