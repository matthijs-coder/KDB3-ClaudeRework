define([
  "./port.js",
  "../../../tabs/tabMutation/slotStock/index.js"
], function (_port, _engine) {
  "use strict";

  // widgetBase's side of the tab mutation saga (widgetBase/{prepare,apply}TabMutation, restoreTabMutationSnapshot):
  // the tabs-owned slot-stock engine, run against widgetBase through its port.

  function bind(_handler) {
    return function (_context, _action) {
      return _handler(_context._KDB, _port.createSlotStockPort(_context), _action);
    };
  }

  // widgetBase destroy ends an in-flight run: resetting the ledger makes its placement guards report "superseded".
  function resetOnDestroy(_KDB) {
    _engine.ledger.reset(_KDB);
  }

  return {
    resetOnDestroy: resetOnDestroy,
    handlePrepareTabMutation: bind(_engine.handlePrepareTabMutation),
    handleApplyTabMutation: bind(_engine.handleApplyTabMutation),
    handleRestoreTabMutationSnapshot: bind(_engine.handleRestoreTabMutationSnapshot)
  };
});
