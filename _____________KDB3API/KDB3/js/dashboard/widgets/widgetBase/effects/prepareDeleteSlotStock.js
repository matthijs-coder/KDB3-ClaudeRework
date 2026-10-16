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
      if (plan.operation === "delete" && payload.widgetRebuild !== true) {
        return await prepareUserDelete(_context, plan, _snapshot);
      }
      if (plan.operation === "restoreDeleted") {
        return await prepareRestoreDeleted(_context, plan, _snapshot, payload);
      }
      return fail(_codes.PREPARE_FAILED, "prepareDeleteSlotStock requires a user delete or restoreDeleted plan.");
    } catch (err) {
      console.error("[widgetBase.prepareDeleteSlotStock] failed", err);
      throw err;
    }
  }
  async function prepareUserDelete(_context, _plan, _snapshot) {
    try {
      var participating = participatingTabIds(_plan);
      var rollback = liveMap(_context, _plan, participating);
      var rebuild = {};
      var moves = _plan.slotMoves || [];
      var index = 0;
      var hideTabId = _plan.hideSlot && _plan.hideSlot.tabId;
      while (index < moves.length) {
        rebuild[moves[index].toTabId] = rollback[moves[index].fromTabId] || [];
        index += 1;
      }
      if (hideTabId && Object.prototype.hasOwnProperty.call(rebuild, hideTabId)) {
        return fail(_codes.PREPARE_FAILED, "Hide slot is not a delete rebuild destination.", hideTabId);
      }
      return await commitMaps(_context, _snapshot, rebuild, rollback, participating, true);
    } catch (err) {
      console.error("[widgetBase.prepareUserDelete] failed", err);
      throw err;
    }
  }
  async function prepareRestoreDeleted(_context, _plan, _snapshot, _payload) {
    try {
      var source = _payload && _payload.serializedByTabId;
      if (!isPlainObject(source)) {
        return fail(_codes.PREPARE_FAILED, "restoreDeleted requires a plain serializedByTabId object.");
      }
      var rebuild = cloneJson(source);
      var keys = Object.keys(rebuild);
      return await commitMaps(_context, _snapshot, rebuild, liveMap(_context, _plan, keys), keys, false);
    } catch (err) {
      console.error("[widgetBase.prepareRestoreDeleted] failed", err);
      throw err;
    }
  }
  async function commitMaps(_context, _snapshot, _rebuild, _rollback, _kindTabIds, _returnRollback) {
    try {
      var unsupported = findUnsupported(_context, _kindTabIds);
      if (unsupported) { return unsupported; }
      var shortage = await _countDuplicateSlotStock(_context, _rebuild);
      if (shortage) { return shortage; }
      _snapshot.rebuildByTabId = _rebuild;
      _snapshot.rollbackByTabId = _rollback;
      _snapshot.slotStockRebuild = true;
      var result = { ok: true, diagnostics: [] };
      if (_returnRollback === true) { result.rollbackByTabId = _rollback; }
      return result;
    } catch (err) {
      console.error("[widgetBase.commitMaps] failed", err);
      throw err;
    }
  }
  function participatingTabIds(_plan) {
    var seen = {};
    var ids = [];
    var moves = _plan.slotMoves || [];
    var index = 0;
    collectId(seen, ids, _plan.deletedSlot && _plan.deletedSlot.tabId);
    collectId(seen, ids, _plan.hideSlot && _plan.hideSlot.tabId);
    while (index < moves.length) {
      collectId(seen, ids, moves[index].fromTabId);
      collectId(seen, ids, moves[index].toTabId);
      index += 1;
    }
    return ids;
  }
  function collectId(seen, ids, tabId) { if (tabId && seen[tabId] !== true) { seen[tabId] = true; ids.push(tabId); } }
  function liveMap(_context, _plan, _tabIds) {
    var map = {};
    var index;
    for (index = 0; index < _tabIds.length; index += 1) {
      map[_tabIds[index]] = serializeTab(_context, _plan, _tabIds[index]);
    }
    return map;
  }
  function serializeTab(_context, _plan, _tabId) {
    var frames = _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabId).filter(shouldSerializeFrame);
    var rows = [];
    var tabIdx = readTabIdx(_plan, _tabId);
    var index = 0;
    while (index < frames.length) {
      var serialized = _serializeWidgetFrame(_context._KDB, frames[index], tabIdx);
      if (serialized && serialized.entry) { rows.push({ sourceWidgetId: frames[index].widgetId, entry: serialized.entry }); }
      index += 1;
    }
    return rows;
  }
  function shouldSerializeFrame(frame) { return frame && frame.lifecycle !== "disposed" && (frame.kind === "vis" || frame.kind === "text") && frame.role !== "topNHelper" && frame.widgetId !== "kdb3widget"; }
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
    var index;
    var moves = _plan.slotMoves || [];
    for (index = 0; index < slots.length; index += 1) {
      if (slots[index] && slots[index].tabId === _tabId && typeof slots[index].tabIdx === "number") { return slots[index].tabIdx; }
    }
    for (index = 0; index < moves.length; index += 1) {
      if (moves[index].fromTabId === _tabId && typeof moves[index].fromTabIdx === "number") { return moves[index].fromTabIdx; }
      if (moves[index].toTabId === _tabId && typeof moves[index].toTabIdx === "number") { return moves[index].toTabIdx; }
    }
    return null;
  }
  function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
  function isPlainObject(value) { return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
  function fail(code, message, tabId, kind) {
    var diagnostic = { code: code, message: message };
    if (tabId) { diagnostic.tabId = tabId; }
    if (kind) { diagnostic.kind = kind; }
    return { ok: false, diagnostics: [diagnostic] };
  }
  return __controller;
});
