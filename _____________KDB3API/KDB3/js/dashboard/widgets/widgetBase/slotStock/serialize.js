define([
  "../../../../core/services/writeback/get/collectors/buildWidgetObject.js",
  "../config.js",
  "../history.js",
  "../launchpadRoute.js",
  "../../../tabs/config/mutationCodes.js"
], function (_buildWidgetObject, _config, _history, _launchpadRoute, _codes) {
  "use strict";

  function readApiState(_KDB, _owner) {
    var api = _KDB && _KDB.api && _KDB.api[_owner];
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  // Same canvas-px source as the frame layout resolver. Duplicate prepare does not read live DOM.
  function stampCanvasLayout(_frame) {
    var layout = _history.resolveCanvasLayoutFromFrame(_frame);
    if (!layout) {
      return _frame || {};
    }
    return Object.assign({}, _frame, { layout: layout });
  }

  function serializeWidgetFrame(_KDB, _frame, _tabIdx) {
    var diagnostics = [];
    var widgetId = _frame && _frame.widgetId ? _frame.widgetId : null;
    try {
      var frame = stampCanvasLayout(_frame);
      var settingsByWidget = (readApiState(_KDB, "widgetSettings") || {}).byWidget || {};
      var visById = (readApiState(_KDB, "widgetVis") || {}).byId || {};
      var textById = (readApiState(_KDB, "widgetText") || {}).byId || {};
      var entry = _buildWidgetObject(frame, _tabIdx, settingsByWidget[widgetId], visById[widgetId], textById[widgetId], diagnostics);
      if (entry === null) {
        return { ok: false, entry: null, diagnostics: diagnostics };
      }
      return { ok: true, entry: entry, diagnostics: diagnostics };
    } catch (err) {
      console.error("[widgetBase.serializeWidgetFrame] failed", { widgetId: widgetId }, err);
      return {
        ok: false,
        entry: null,
        diagnostics: diagnostics.concat([{ code: "WRITEBACK_WIDGET_RESTORE_FAILED", message: String(err && err.message ? err.message : err) }])
      };
    }
  }

  function shouldSerializeFrame(frame) {
    return frame && frame.lifecycle !== "disposed"
      && (frame.kind === "vis" || frame.kind === "text")
      && frame.role !== "topNHelper"
      && frame.widgetId !== _config.HOST_WIDGET_ID;
  }

  function readTabIdx(_plan, _tabId) {
    var slots = [_plan.sourceSlot, _plan.insertSlot, _plan.revealSlot, _plan.deletedSlot, _plan.hideSlot, _plan.landing];
    var moves = _plan.slotMoves || [];
    var index;
    for (index = 0; index < slots.length; index += 1) {
      if (slots[index] && slots[index].tabId === _tabId && typeof slots[index].tabIdx === "number") { return slots[index].tabIdx; }
    }
    for (index = 0; index < moves.length; index += 1) {
      if (moves[index].fromTabId === _tabId && typeof moves[index].fromTabIdx === "number") { return moves[index].fromTabIdx; }
      if (moves[index].toTabId === _tabId && typeof moves[index].toTabIdx === "number") { return moves[index].toTabIdx; }
    }
    return null;
  }

  function serializeTab(_context, _plan, _tabId, _requireFiniteTabIdx) {
    var frames = _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabId).filter(shouldSerializeFrame);
    var tabIdx = readTabIdx(_plan, _tabId);
    var rows = [];
    if (_requireFiniteTabIdx === true && (typeof tabIdx !== "number" || isFinite(tabIdx) !== true)) {
      return rows;
    }
    frames.forEach(function (frame) {
      var serialized = serializeWidgetFrame(_context._KDB, frame, tabIdx);
      if (serialized && serialized.entry) {
        rows.push({ sourceWidgetId: frame.widgetId, entry: serialized.entry });
      }
    });
    return rows;
  }

  // Live serialized rows per tab. Only move skips tabs without a finite tabIdx.
  function liveMap(_context, _plan, _tabIds, _requireFiniteTabIdx) {
    var map = {};
    _tabIds.forEach(function (tabId) {
      map[tabId] = serializeTab(_context, _plan, tabId, _requireFiniteTabIdx);
    });
    return map;
  }

  function fail(code, message, tabId, kind) {
    var diagnostic = { code: code, message: message };
    if (tabId) { diagnostic.tabId = tabId; }
    if (kind) { diagnostic.kind = kind; }
    return { ok: false, diagnostics: [diagnostic] };
  }

  function findUnsupported(_context, _tabIds) {
    var index;
    var frameIndex;
    for (index = 0; index < _tabIds.length; index += 1) {
      var frames = _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabIds[index]);
      for (frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
        var frame = frames[frameIndex];
        if (frame && frame.widgetId !== _config.HOST_WIDGET_ID && frame.role !== "topNHelper" && frame.kind !== "vis" && frame.kind !== "text") {
          var message = "Unsupported widget kind \"" + String(frame.kind) + "\" on tab " + String(_tabIds[index]) + ".";
          return fail(_codes.KIND_UNSUPPORTED, message, _tabIds[index], frame.kind);
        }
      }
    }
    return null;
  }

  function stockFail(code, message, tabId, kind) {
    return { ok: false, diagnostics: [{ code: code, message: message, tabId: tabId, kind: kind }] };
  }

  function countDemand(_rows, _kind) {
    return _rows.filter(function (row) { return row && row.entry && row.entry.kind === _kind; }).length;
  }

  async function countStock(_context, _tabId, _padKey, _frameKind) {
    var seen = {};
    var count = 0;
    _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabId).forEach(function (frame) {
      if (frame.kind === _frameKind && frame.widgetId) {
        seen[frame.widgetId] = true;
        count += 1;
      }
    });
    var api = _context._KDB && _context._KDB.api && _context._KDB.api.launchpad;
    if (!api || typeof api.dispatch !== "function") { return { unevaluable: true, count: count }; }
    var result = await api.dispatch({ type: "launchpad/readSlotWidgets", payload: { padKey: _padKey, tabId: _tabId, mode: "all" } });
    if (!result || result.ok !== true) { return { unevaluable: true, count: count }; }
    var sawUnevaluable = false;
    (Array.isArray(result.widgets) ? result.widgets : []).forEach(function (widget) {
      var widgetId = widget && widget.widgetId;
      if (widgetId && !seen[widgetId]) {
        var eligibility = _launchpadRoute.readPadShellEligibility(_context, widgetId);
        if (eligibility === "unevaluable") { sawUnevaluable = true; }
        if (eligibility === "yes") { count += 1; }
      }
    });
    return { unevaluable: sawUnevaluable, count: count };
  }

  async function shortageFor(_context, _tabId, _rows, _entryKind, _padKey, _frameKind) {
    var demand = countDemand(_rows, _entryKind);
    if (demand === 0) { return null; }
    var stock = await countStock(_context, _tabId, _padKey, _frameKind);
    if (stock.unevaluable && demand > stock.count) {
      return stockFail(_codes.PREPARE_FAILED, "Widget stock could not be evaluated.", _tabId, _entryKind);
    }
    if (demand > stock.count) {
      return stockFail(_codes.STOCK_SHORT, "Not enough " + _entryKind + " stock on tab " + String(_tabId) + ".", _tabId, _entryKind);
    }
    return null;
  }

  // First vis or text shortage over the rebuild destinations, or null when every destination has enough shells.
  async function findStockShortage(_context, _rebuildByTabId) {
    var keys = Object.keys(_rebuildByTabId || {});
    for (var index = 0; index < keys.length; index += 1) {
      var rows = _rebuildByTabId[keys[index]] || [];
      var visShort = await shortageFor(_context, keys[index], rows, "vis", _config.CHANNELS.VISUALIZATION, "vis");
      if (visShort) { return visShort; }
      var textShort = await shortageFor(_context, keys[index], rows, "txt", _config.CHANNELS.TEXT, "text");
      if (textShort) { return textShort; }
    }
    return null;
  }

  return {
    serializeWidgetFrame: serializeWidgetFrame,
    liveMap: liveMap,
    findUnsupported: findUnsupported,
    findStockShortage: findStockShortage,
    fail: fail
  };
});
