define([], function () {
  "use strict";

  function requestOriginalButtonClick(_KDB, _handoffContext, _buttonTid, _options) {
    if (_options && typeof _options.clickOriginalButton === "function") {
      _options.clickOriginalButton(_handoffContext, _buttonTid);
      return;
    }
    if (!_KDB || !_KDB.api || !_KDB.api.filterDock || typeof _KDB.api.filterDock.dispatch !== "function") {
      return;
    }
    _KDB.api.filterDock.dispatch({
      type: "filterDock/clickOriginalButtonRequested",
      payload: {
        filterKey: _handoffContext.filterKey,
        filterId: _handoffContext.filterId,
        filterLabel: _handoffContext.filterLabel,
        buttonTid: _buttonTid
      }
    });
  }

  function requestClosePopup(_KDB, _options) {
    if (_options && typeof _options.closePopup === "function") {
      _options.closePopup();
      return;
    }
    if (!_KDB || !_KDB.api || !_KDB.api.filterDock || typeof _KDB.api.filterDock.dispatch !== "function") {
      return;
    }
    _KDB.api.filterDock.dispatch({
      type: "filterDock/closeActivePopupRequested",
      payload: {}
    });
  }

  return {
    requestOriginalButtonClick: requestOriginalButtonClick,
    requestClosePopup: requestClosePopup
  };
});
