define([
  "../config/launchpadChannels.js",
  "../../../tabs/config/mutationCodes.js",
  "../actions/resolveDropClaim.js"
], function (_launchpadChannels, _codes, _resolveDropClaim) {
  "use strict";

  async function __controller(_context, _rebuildByTabId) {
    try {
      var keys = Object.keys(_rebuildByTabId || {});
      var index = 0;
      while (index < keys.length) {
        var rows = _rebuildByTabId[keys[index]] || [];
        var visShort = await shortageFor(_context, keys[index], rows, "vis", _launchpadChannels.CHANNELS.VISUALIZATION, "vis");
        if (visShort) { return visShort; }
        var textShort = await shortageFor(_context, keys[index], rows, "txt", _launchpadChannels.CHANNELS.TEXT, "text");
        if (textShort) { return textShort; }
        index += 1;
      }
      return null;
    } catch (err) {
      console.error("[widgetBase.countDuplicateSlotStock] failed", err);
      throw err;
    }
  }

  async function shortageFor(_context, _tabId, _rows, _entryKind, _padKey, _frameKind) {
    var demand = countDemand(_rows, _entryKind);
    if (demand === 0) { return null; }
    var stock = await countStock(_context, _tabId, _padKey, _frameKind);
    if (stock.unevaluable && demand > stock.count) {
      return fail(_codes.PREPARE_FAILED, "Widget stock could not be evaluated.", _tabId, _entryKind);
    }
    if (demand > stock.count) {
      return fail(_codes.STOCK_SHORT, "Not enough " + _entryKind + " stock on tab " + String(_tabId) + ".", _tabId, _entryKind);
    }
    return null;
  }

  async function countStock(_context, _tabId, _padKey, _frameKind) {
    var canvas = _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabId);
    var seen = {};
    var count = 0;
    var index = 0;
    while (index < canvas.length) {
      if (canvas[index].kind === _frameKind && canvas[index].widgetId) {
        seen[canvas[index].widgetId] = true;
        count += 1;
      }
      index += 1;
    }
    var api = _context._KDB && _context._KDB.api && _context._KDB.api.launchpad;
    if (!api || typeof api.dispatch !== "function") { return { unevaluable: true, count: count }; }
    var result = await api.dispatch({ type: "launchpad/readSlotWidgets", payload: { padKey: _padKey, tabId: _tabId, mode: "all" } });
    if (!result || result.ok !== true) { return { unevaluable: true, count: count }; }
    var widgets = Array.isArray(result.widgets) ? result.widgets : [];
    var sawUnevaluable = false;
    index = 0;
    while (index < widgets.length) {
      var widgetId = widgets[index] && widgets[index].widgetId;
      if (widgetId && !seen[widgetId]) {
        var eligibility = _resolveDropClaim.readPadShellEligibility(_context, widgetId);
        if (eligibility === "unevaluable") { sawUnevaluable = true; }
        if (eligibility === "yes") { count += 1; }
      }
      index += 1;
    }
    return { unevaluable: sawUnevaluable, count: count };
  }

  function countDemand(_rows, _kind) {
    var count = 0;
    var index = 0;
    while (index < _rows.length) {
      if (_rows[index] && _rows[index].entry && _rows[index].entry.kind === _kind) { count += 1; }
      index += 1;
    }
    return count;
  }

  function fail(code, message, tabId, kind) {
    return { ok: false, diagnostics: [{ code: code, message: message, tabId: tabId, kind: kind }] };
  }

  return __controller;
});
