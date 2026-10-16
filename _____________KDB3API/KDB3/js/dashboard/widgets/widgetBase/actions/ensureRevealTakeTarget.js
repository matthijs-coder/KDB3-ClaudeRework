define(["../../../tabs/actions/guardParameterSetRun.js"], function (_guardParameterSetRun) {
  "use strict";

  async function ensureRevealTakeTarget(_context, revealSlot) {
    await _guardParameterSetRun.waitForInflightTraversals(_context._KDB);
    var activation = await _context._KDB.api.tabs.dispatch({
      type: "tabs/traverse",
      payload: {
        source: "tabsMutation",
        scope: "singleTab",
        tabIndex: revealSlot.index,
        includeHiddenDashboardTabs: true,
        restoreActiveTab: false,
        waitFor: "canvas"
      }
    });
    if (activation !== true) {
      throw new Error("Failed to activate reveal slot before duplicate shift take.");
    }
    var dragDrop = _context._KDB.api.dragDrop;
    if (dragDrop && typeof dragDrop.refreshDropboxes === "function") {
      dragDrop.refreshDropboxes();
    }
  }

  return ensureRevealTakeTarget;
});
