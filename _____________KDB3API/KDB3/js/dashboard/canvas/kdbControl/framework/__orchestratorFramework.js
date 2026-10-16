define([
  "./buildControlShell",
  "./placeControlShell",
  "./bindFrameworkView",
  "./syncFrameworkViewFromState",
  "./followActiveTab",
  "../../../header/events/eventNames",
], function (_buildControlShell, _placeControlShell, _bindFrameworkView, _syncFrameworkViewFromState, _followActiveTab, _headerEventNames) {
  "use strict";
  function __orchestrator(_KDB, _surface) {
    var shell = _buildControlShell(_KDB);
    _placeControlShell(_KDB, shell);
    if (!_bindFrameworkView(_KDB, _surface)) {
      return null;
    }
    var rt = _KDB.runtime.kdbControl;
    var bus = _KDB.events;
    if (bus && typeof bus.subscribe === "function" && rt) {
      rt.subscriptions = rt.subscriptions || {};
      rt.subscriptions.headerFooterToolboxReadSync = bus.subscribe(_headerEventNames.HEADER_CONFIRMED_CHANGED, function () {
        try {
          _syncFrameworkViewFromState(_KDB);
        } catch (err) {
          console.error("[kdbControl.headerFooterToolboxReadSync]", err);
        }
      });
    }
    _followActiveTab(_KDB);
    return shell;
  }
  return __orchestrator;
});
