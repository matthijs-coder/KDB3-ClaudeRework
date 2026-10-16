define([
  "./ledger.js",
  "./prepare.js",
  "./apply.js",
  "./rollback.js"
], function (_ledger, _prepare, _apply, _rollback) {
  "use strict";

  // The slot-stock engine of the tab mutation saga: the widget owner's prepare, apply and rollback handlers,
  // written against an injected widget port, plus the snapshot ledger the saga releases after every run.
  //
  // Port contract (built by the widget owner for one dispatch; see widgetBase/slotStock/port.js):
  //   ownerLabel                          text used in diagnostics
  //   readAffectedFrames(plan)            cloned frames of the plan's affected tabs, by widgetId
  //   isRouted(tabId)                     the tab's widget slots are routed
  //   liveMap(plan, tabIds, requireFiniteTabIdx)   serialized rows per tab
  //   findUnsupported(tabIds), findStockShortage(rebuildByTabId), fail(code, message, tabId)
  //   rebuildSlot(tabId, rows, deps)      park the tab's widgets, then place rows; deps = {plan, parked, placeOptions, runId, isStale}
  //   fillContent(created, rows)          restore content of created widgets -> { degraded: [] }
  //   readFrame(widgetId), routeToLaunchpad(widgetId, tabId), takeFromLaunchpad(widgetId, tabId), registerFrame(widgetId, frame)
  return {
    handlePrepareTabMutation: _prepare.handlePrepareTabMutation,
    handleApplyTabMutation: _apply.handleApplyTabMutation,
    handleRestoreTabMutationSnapshot: _rollback.handleRestoreTabMutationSnapshot,
    ledger: _ledger
  };
});
