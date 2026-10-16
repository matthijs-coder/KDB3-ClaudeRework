define([
  "../actions/serializeWidgetFrame.js",
  "../../../tabs/config/mutationCodes.js",
  "./countDuplicateSlotStock.js"
], function (_serializeWidgetFrame, _codes, _countDuplicateSlotStock) {
  "use strict";

  async function __controller(_context, _plan, _snapshot, _payload) {
    try {
      var payload = _payload || {};
      var plan = _plan || {};
      if (payload.widgetRebuild === true) {
        return await prepareUndo(_context, plan, _snapshot, payload);
      }
      if (plan.operation !== "duplicate") {
        return fail(_codes.PREPARE_FAILED, "prepareDuplicateSlotStock requires a duplicate plan.");
      }
      return await prepareForward(_context, plan, _snapshot);
    } catch (err) {
      console.error("[widgetBase.prepareDuplicateSlotStock] failed", err);
      throw err;
    }
  }

  async function prepareUndo(_context, _plan, _snapshot, _payload) {
    var rebuild = cloneJson(_payload.serializedByTabId);
    _snapshot.widgetRebuild = true;
    _snapshot.rebuildByTabId = rebuild;
    _snapshot.rollbackByTabId = liveMap(_context, _plan, Object.keys(rebuild));
    return finishStock(_context, _snapshot, Object.keys(rebuild));
  }

  async function prepareForward(_context, _plan, _snapshot) {
    var serialized = liveMap(_context, _plan, _plan.affectedTabIds || []);
    var rebuild = {};
    var moves = _plan.slotMoves || [];
    var index = 0;
    while (index < moves.length) {
      rebuild[moves[index].toTabId] = serialized[moves[index].fromTabId] || [];
      index += 1;
    }
    if (_plan.insertSlot && _plan.insertSlot.tabId) {
      rebuild[_plan.insertSlot.tabId] = serialized[_plan.sourceSlot && _plan.sourceSlot.tabId] || [];
    }
    _snapshot.rebuildByTabId = rebuild;
    _snapshot.rollbackByTabId = rollbackFrom(serialized, rebuild);
    _snapshot.serializedByTabId = serialized;
    return finishStock(_context, _snapshot, _plan.affectedTabIds || []);
  }

  async function finishStock(_context, _snapshot, _kindTabIds) {
    var unsupported = findUnsupported(_context, _kindTabIds);
    if (unsupported) { return unsupported; }
    var shortage = await _countDuplicateSlotStock(_context, _snapshot.rebuildByTabId);
    if (shortage) { return shortage; }
    delete _snapshot.serializedByTabId;
    return { ok: true, diagnostics: [] };
  }

  function liveMap(_context, _plan, _tabIds) {
    var map = {};
    var index = 0;
    while (index < _tabIds.length) {
      map[_tabIds[index]] = serializeTab(_context, _plan, _tabIds[index]);
      index += 1;
    }
    return map;
  }

  function rollbackFrom(_serialized, _rebuild) {
    var rollback = {};
    var keys = Object.keys(_rebuild);
    var index = 0;
    while (index < keys.length) {
      rollback[keys[index]] = _serialized[keys[index]] || [];
      index += 1;
    }
    return rollback;
  }

  function serializeTab(_context, _plan, _tabId) {
    var frames = _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabId).filter(shouldSerializeFrame);
    var rows = [];
    var tabIdx = readTabIdx(_plan, _tabId);
    var index = 0;
    while (index < frames.length) {
      var serialized = _serializeWidgetFrame(_context._KDB, frames[index], tabIdx);
      if (serialized && serialized.entry) {
        rows.push({ sourceWidgetId: frames[index].widgetId, entry: serialized.entry });
      }
      index += 1;
    }
    return rows;
  }

  function shouldSerializeFrame(frame) {
    return frame && frame.lifecycle !== "disposed"
      && (frame.kind === "vis" || frame.kind === "text")
      && frame.role !== "topNHelper"
      && frame.widgetId !== "kdb3widget";
  }

  function findUnsupported(_context, _tabIds) {
    var index = 0;
    while (index < _tabIds.length) {
      var frames = _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabIds[index]);
      var frameIndex = 0;
      while (frameIndex < frames.length) {
        var frame = frames[frameIndex];
        if (frame && frame.widgetId !== "kdb3widget" && frame.role !== "topNHelper" && frame.kind !== "vis" && frame.kind !== "text") {
          return fail(_codes.KIND_UNSUPPORTED, "Unsupported widget kind \"" + String(frame.kind) + "\" on tab " + String(_tabIds[index]) + ".", _tabIds[index], frame.kind);
        }
        frameIndex += 1;
      }
      index += 1;
    }
    return null;
  }

  function readTabIdx(_plan, _tabId) {
    var slots = [_plan.sourceSlot, _plan.insertSlot, _plan.revealSlot, _plan.deletedSlot, _plan.hideSlot, _plan.landing];
    var index = 0;
    while (index < slots.length) {
      if (slots[index] && slots[index].tabId === _tabId && typeof slots[index].tabIdx === "number") { return slots[index].tabIdx; }
      index += 1;
    }
    var moves = _plan.slotMoves || [];
    index = 0;
    while (index < moves.length) {
      if (moves[index].fromTabId === _tabId && typeof moves[index].fromTabIdx === "number") { return moves[index].fromTabIdx; }
      if (moves[index].toTabId === _tabId && typeof moves[index].toTabIdx === "number") { return moves[index].toTabIdx; }
      index += 1;
    }
    return null;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value && typeof value === "object" ? value : {}));
  }

  function fail(code, message, tabId, kind) {
    var diagnostic = { code: code, message: message };
    if (tabId) { diagnostic.tabId = tabId; }
    if (kind) { diagnostic.kind = kind; }
    return { ok: false, diagnostics: [diagnostic] };
  }

  return __controller;
});
