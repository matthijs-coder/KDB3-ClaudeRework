define([
  "./serialize.js",
  "./placeEntries.js",
  "./fillContent.js",
  "../runtime.js",
  "../../../../core/utils/kit/data.js"
], function (_serialize, _placeEntries, _fillContent, _runtime, _data) {
  "use strict";

  // The widget side of the tab-mutation slot-stock engine (tabs/tabMutation/slotStock): everything the engine needs
  // from widgetBase, bound to one dispatch context. The engine never touches widgetBase state or runtime directly.

  function readAffectedFrames(_context, _plan) {
    var base = _context._KDB.state && _context._KDB.state.widgets && _context._KDB.state.widgets.base || {};
    var byId = base.byId || {};
    var affected = {};
    Object.keys(byId).forEach(function (widgetId) {
      var frame = byId[widgetId];
      if (frame && _plan.affectedTabIds.indexOf(frame.tabId) >= 0) {
        affected[widgetId] = _data.cloneJson(frame);
      }
    });
    return affected;
  }

  function isRouted(_context, _tabId) {
    _runtime.ensureWidgetBaseRuntime(_context._KDB);
    return _context._KDB.runtime.widgetBase.routedTabIds[_tabId] === true;
  }

  function createSlotStockPort(_context) {
    return {
      ownerLabel: "widgetBase",
      readAffectedFrames: function (plan) { return readAffectedFrames(_context, plan); },
      isRouted: function (tabId) { return isRouted(_context, tabId); },
      liveMap: function (plan, tabIds, requireFiniteTabIdx) { return _serialize.liveMap(_context, plan, tabIds, requireFiniteTabIdx); },
      findUnsupported: function (tabIds) { return _serialize.findUnsupported(_context, tabIds); },
      findStockShortage: function (rebuildByTabId) { return _serialize.findStockShortage(_context, rebuildByTabId); },
      fail: _serialize.fail,
      rebuildSlot: function (tabId, rows, deps) { return _placeEntries.rebuildSlotFromEntries(_context, tabId, rows, deps); },
      fillContent: function (created, rows) { return _fillContent.fillDuplicateWidgetContent(_context, created, rows); },
      readFrame: function (widgetId) { return _context.selectors.readFrame(_context._KDB, widgetId); },
      routeToLaunchpad: function (widgetId, tabId) {
        return _context.dispatch({
          type: _context.actionTypes.ROUTE_TO_LAUNCHPAD,
          widgetId: widgetId,
          payload: { widgetId: widgetId, tabId: tabId, reason: "rollback", isHistoryReplay: true }
        });
      },
      takeFromLaunchpad: function (widgetId, tabId) {
        return _context.dispatch({
          type: _context.actionTypes.TAKE_FROM_LAUNCHPAD,
          widgetId: widgetId,
          payload: { tabId: tabId, reason: "rollback", isHistoryReplay: true }
        });
      },
      registerFrame: function (widgetId, frame) {
        _context.dispatchInternal({ type: _context.actionTypes.REGISTER_FRAME, payload: { widgetId: widgetId, frame: frame } });
      }
    };
  }

  return { createSlotStockPort: createSlotStockPort };
});
