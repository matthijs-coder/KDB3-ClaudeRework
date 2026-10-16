define([], function () {
  "use strict";

  async function parkCreatedWidgetsForRollback(_context, createdWidgetIds, unrecoverable) {
    if (!Array.isArray(createdWidgetIds)) { return; }
    for (var i = 0; i < createdWidgetIds.length; i += 1) {
      var widgetId = createdWidgetIds[i];
      var current = _context.selectors.readFrame(_context._KDB, widgetId);
      if (!current || current.placement !== "onCanvas") { continue; }
      var routed = await _context.dispatch({
        type: _context.actionTypes.ROUTE_TO_LAUNCHPAD,
        widgetId: widgetId,
        payload: { widgetId: widgetId, tabId: current.tabId, reason: "rollback", isHistoryReplay: true }
      });
      if (!routed || routed.ok !== true) { unrecoverable.push(widgetId); }
    }
  }

  return parkCreatedWidgetsForRollback;
});
