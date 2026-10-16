define([
  "../config/actions.js",
  "./clickOriginalPopupButton.js",
  "./closeActivePopup.js"
], function (_actions, _clickOriginalPopupButton, _closeActivePopup) {
  "use strict";

  function dispatchFilterDockDomAction(_KDB, _action) {
    if (!_action || !_action.type) {
      return false;
    }
    if (_action.type === _actions.CLICK_ORIGINAL_BUTTON_REQUESTED) {
      return _clickOriginalPopupButton(_KDB, _action.payload || {});
    }
    if (_action.type === _actions.CLOSE_ACTIVE_POPUP_REQUESTED) {
      return _closeActivePopup(_KDB);
    }
    return false;
  }

  return dispatchFilterDockDomAction;
});
