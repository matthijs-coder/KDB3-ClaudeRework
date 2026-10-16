define([], function () {
  "use strict";

  var SINGLE_SELECT_STATE_CHANGED = "singleSelect/filterDockStateChanged";
  var SINGLE_SELECT_POPUP_READY = "singleSelect/filterDockPopupReady";

  function buildDelegatedPayload(_mappedHandoff, _alleAllowed) {
    return Object.assign({}, _mappedHandoff, {
      filterType: "specialSingleSelect",
      authorizedByOwner: "specialSingleSelect",
      semanticSpecialFilterId: _mappedHandoff.semanticSpecialFilterId || _mappedHandoff.filterId,
      runtimeFilterId: _mappedHandoff.runtimeFilterId || null,
      filterConfig: Object.assign({}, _mappedHandoff.filterConfig || {}),
      capabilities: Object.assign({}, _mappedHandoff.capabilities || {}, {
        hasAlleOption: _alleAllowed === true
      })
    });
  }

  function delegateToSingleSelect(_KDB, _mappedHandoff, _actionType, _alleAllowed) {
    var api = _KDB && _KDB.api ? _KDB.api.singleSelect : null;
    var dispatchType;
    if (!api || typeof api.dispatch !== "function" || !_mappedHandoff) {
      return false;
    }
    dispatchType =
      _actionType === "specialSingleSelect/filterDockPopupReady"
        ? SINGLE_SELECT_POPUP_READY
        : SINGLE_SELECT_STATE_CHANGED;
    api.dispatch({ type: dispatchType, payload: buildDelegatedPayload(_mappedHandoff, _alleAllowed) });
    return true;
  }

  return {
    delegateToSingleSelect: delegateToSingleSelect
  };
});
