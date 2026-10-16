define([
  "./placeSerializedWidgetEntry.js",
  "../../../tabs/effects/hasTabInnerFrame.js"
], function (_placeSerializedWidgetEntry, _hasTabInnerFrame) {
  "use strict";

  async function __controller(_context, _tabId, _rows, _deps) {
    var created = [];
    var degradedEntries = [];
    try {
      var rows = Array.isArray(_rows) ? _rows : [];
      var deps = _deps || {};
      if (rows.length === 0) {
        await parkTabCanvas(_context, _tabId, deps);
        return { ok: true, created: created, degradedEntries: degradedEntries };
      }
      await deps.ensureRevealTakeTarget(_context, { index: destinationIndex(deps, _tabId), tabId: _tabId });
      if (_hasTabInnerFrame(_context._KDB, _tabId) !== true) {
        return {
          ok: false,
          structural: true,
          created: created,
          degradedEntries: degradedEntries,
          message: "Destination page is not inside its tab wrapper."
        };
      }
      await parkTabCanvas(_context, _tabId, deps);
      var index = 0;
      while (index < rows.length) {
        if (deps.isStale(_context._KDB, deps.runId)) {
          return { ok: false, superseded: true, structural: true, created: [], degradedEntries: [] };
        }
        var row = rows[index] || {};
        var placeResult = await _placeSerializedWidgetEntry(_context, row.entry, _tabId, Object.assign({}, deps.placeOptions, { entryIndex: index }));
        if (placeResult && placeResult.superseded) {
          return { ok: false, superseded: true, structural: true, created: [], degradedEntries: [] };
        }
        if (placeResult && placeResult.threw === true) {
          return { ok: false, structural: true, created: created, degradedEntries: degradedEntries, message: readDiagMessage(placeResult) };
        }
        if (!placeResult || !placeResult.ok) {
          degradedEntries.push({ sourceWidgetId: row.sourceWidgetId, code: readDiagCode(placeResult), message: readDiagMessage(placeResult) });
        } else {
          if (placeResult.degraded === true) {
            degradedEntries.push({ sourceWidgetId: row.sourceWidgetId, code: "WRITEBACK_SETTINGS_CHROME_DEGRADED", message: "duplicate widget placement degraded" });
          }
          created.push({ sourceWidgetId: row.sourceWidgetId, widgetId: placeResult.widgetId });
        }
        index += 1;
      }
      return { ok: true, created: created, degradedEntries: degradedEntries };
    } catch (err) {
      console.error("[widgetBase.rebuildSlotFromEntries] failed", err);
      throw err;
    }
  }

  async function parkTabCanvas(_context, _tabId, _deps) {
    var frames = _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabId);
    var index = 0;
    var reason = _deps.placeOptions && _deps.placeOptions.reason;
    while (index < frames.length) {
      await _deps.routeWidget(_context, frames[index].widgetId, _tabId, _deps.parked, reason, routeHintsForFrame(frames[index]));
      index += 1;
    }
  }

  function destinationIndex(_deps, _tabId) {
    if (typeof _deps.index === "number") { return _deps.index; }
    var plan = _deps.plan || {};
    var slots = [plan.insertSlot, plan.revealSlot, plan.deletedSlot, plan.hideSlot, plan.landing];
    var index = 0;
    while (index < slots.length) {
      if (slots[index] && slots[index].tabId === _tabId && typeof slots[index].index === "number") { return slots[index].index; }
      index += 1;
    }
    var moves = plan.slotMoves || [];
    index = 0;
    while (index < moves.length) {
      if (moves[index].toTabId === _tabId && typeof moves[index].toIndex === "number") { return moves[index].toIndex; }
      if (moves[index].fromTabId === _tabId && typeof moves[index].fromIndex === "number") { return moves[index].fromIndex; }
      index += 1;
    }
    return null;
  }

  function routeHintsForFrame(frame) {
    if (frame && (frame.role === "topNHelper" || frame.kind === "topN")) {
      return { visualType: "LIST", isTopNHelperClaim: true };
    }
    return null;
  }

  function readDiagCode(placeResult) {
    var diag = placeResult && Array.isArray(placeResult.diagnostics) && placeResult.diagnostics[0];
    return diag && diag.code ? diag.code : "WRITEBACK_WIDGET_RESTORE_FAILED";
  }

  function readDiagMessage(placeResult) {
    var diag = placeResult && Array.isArray(placeResult.diagnostics) && placeResult.diagnostics[0];
    return diag && diag.message ? diag.message : "duplicate widget placement failed";
  }

  return __controller;
});
