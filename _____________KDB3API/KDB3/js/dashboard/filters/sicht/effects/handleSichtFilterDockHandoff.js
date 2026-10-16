define([
  "../config/actions.js",
  "./mapFilterDockHandoff.js",
  "./evaluateAndStoreSichtOptions.js",
  "./syncSichtOptionAvailability.js",
  "./delegateToSingleSelect.js",
  "./buildSichtOperationId.js"
], function (
  _actions,
  _mapFilterDockHandoff,
  _evaluateAndStoreSichtOptions,
  _syncSichtOptionAvailability,
  _delegateToSingleSelect,
  _buildSichtOperationId
) {
  "use strict";

  function shouldSyncPopupAvailability(_actionType, _mappedHandoff) {
    if (_actionType === _actions.FILTER_DOCK_POPUP_READY) {
      return true;
    }
    return !!(_mappedHandoff.popup && _mappedHandoff.popup.isVisible === true);
  }

  function handleSichtFilterDockHandoff(_KDB, _dispatchInternal, _payload, _actionType) {
    try {
      var mappedHandoff = _mapFilterDockHandoff(_payload);
      var byOption;
      if (!mappedHandoff) {
        return false;
      }
      _dispatchInternal({
        type: _actionType,
        payload: { timestamp: mappedHandoff.timestamp }
      });
      byOption = _evaluateAndStoreSichtOptions(_KDB, _dispatchInternal);
      if (shouldSyncPopupAvailability(_actionType, mappedHandoff)) {
        _syncSichtOptionAvailability(_KDB, mappedHandoff, byOption);
      }
      return _delegateToSingleSelect(
        _KDB,
        mappedHandoff,
        _actionType,
        byOption,
        _buildSichtOperationId("handoff")
      );
    } catch (error) {
      console.error("[sicht.handleSichtFilterDockHandoff] failed", error);
      return false;
    }
  }

  return handleSichtFilterDockHandoff;
});
