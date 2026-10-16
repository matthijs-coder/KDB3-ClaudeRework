define([
  "./guard.js",
  "../state/ensureWidgetBaseRuntime.js",
  "../effects/resolveContentOwnerApi.js",
  "../effects/dispatchWidgetSettingsPlaceControls.js",
  "../effects/applyWidgetLayout.js",
  "../actions/resolveDropClaim.js",
  "../actions/handleTakeFromLaunchpad.js",
  "../actions/handleSetColour.js",
  "../../widgetVis/config/actionTypes.js",
  "../../widgetText/config/actionTypes.js",
  "../../../tabs/effects/hasTabInnerFrame.js",
  "../../../tabs/actions/guardParameterSetRun.js"
], function (
  _guard, _ensureRuntime, _contentOwnerApi, _dispatchWidgetSettingsPlaceControls, _applyWidgetLayout, _resolveDropClaim,
  _handleTakeFromLaunchpad, _handleSetColour, _widgetVisActionTypes, _widgetTextActionTypes, _hasTabInnerFrame, _guardParameterSetRun
) {
  "use strict";

  var RESTORE_FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var MUTATION_CANCELLED = "TABS_MUTATION_CANCELLED";
  var UNSUPPORTED = "WRITEBACK_WIDGET_KIND_UNSUPPORTED";
  var CHROME_DEGRADED = "WRITEBACK_SETTINGS_CHROME_DEGRADED";

  function dispatchVisCreate(_context, _widgetId, _widget, _payload) {
    var entryIndex = typeof _payload.entryIndex === "number" ? _payload.entryIndex : null;
    var metric = _contentOwnerApi.resolveMetricByCode(_context._KDB, _widget.code || "");
    var diagnostics = [];
    if (!metric.resolved) {
      diagnostics.push({
        code: "WRITEBACK_SKIPPED_BY_DESIGN",
        entryIndex: entryIndex,
        message: "metric display name not resolvable from metrics tree; widget title falls back to metric code"
      });
    }
    var api = _contentOwnerApi.resolveContentApi(_context._KDB, "vis");
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve({ ok: false, message: "widgetVis API is unavailable for restore contentCreate dispatch", diagnostics: diagnostics });
    }
    return _contentOwnerApi.dispatchContentAction(api, {
      type: _widgetVisActionTypes.CONTENT_CREATE,
      widgetId: _widgetId,
      payload: {
        metric: {
          code: _widget.code || "",
          display: metric.display || "",
          metricsTable: metric.metricsTable || "",
          langtext: metric.langtext || "",
          url: metric.url || ""
        },
        code: _widget.code || "",
        source: _payload.source || "writebackSet",
        runId: _payload.runId,
        skipHistory: true,
        isParameterSetRestore: true,
        isHistoryReplay: true
      }
    }).then(function (subResult) {
      return subResult && subResult.ok === true
        ? { ok: true, diagnostics: diagnostics, degraded: diagnostics.length > 0 }
        : { ok: false, message: "widgetVis/contentCreate failed for metric code \"" + String(_widget.code || "") + "\"" };
    }, function (err) {
      return { ok: false, message: "widgetVis/contentCreate threw: " + String(err && err.message ? err.message : err) };
    });
  }

  function dispatchTextCreate(_context, _widgetId, _payload) {
    var api = _contentOwnerApi.resolveContentApi(_context._KDB, "text");
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve({ ok: false, message: "widgetText API is unavailable for restore contentCreate dispatch" });
    }
    return _contentOwnerApi.dispatchContentAction(api, {
      type: _widgetTextActionTypes.CONTENT_CREATE,
      widgetId: _widgetId,
      payload: {
        source: _payload.source || "writebackSet",
        runId: _payload.runId,
        skipHistory: true,
        isParameterSetRestore: true,
        isHistoryReplay: true
      }
    }).then(function (subResult) {
      return subResult && subResult.ok === true
        ? { ok: true }
        : { ok: false, message: "widgetText/contentCreate failed during restore orchestration" };
    }, function (err) {
      return { ok: false, message: "widgetText/contentCreate threw: " + String(err && err.message ? err.message : err) };
    });
  }

  function dispatchRestoreContentCreate(_context, _kind, _widgetId, _widget, _payload) {
    return _kind === "vis"
      ? dispatchVisCreate(_context, _widgetId, _widget, _payload)
      : dispatchTextCreate(_context, _widgetId, _payload);
  }

  function claimParkedShell(_context, _kind, _tabId) {
    return _resolveDropClaim(_context, {
      draggedElementType: _kind === "vis" ? "visualization" : "text",
      sourceKind: _kind === "vis" ? "metricsTreeLeaf" : "toolboxTextButton",
      tabId: _tabId
    });
  }

  function isSuperseded(_runtime, _guardSpec) {
    if (!_guardSpec || typeof _guardSpec.runId !== "number") { return false; }
    var key = _guardSpec.kind === "tabMutationRunId" ? "tabMutationRunId" : "parameterSetRunId";
    return _runtime[key] !== _guardSpec.runId;
  }

  function supersededResult(_guardSpec, _runtime) {
    var code = _guardSpec && _guardSpec.kind === "tabMutationRunId" ? MUTATION_CANCELLED : CANCELLED;
    var message = "placement run superseded";
    if (_guardSpec && _guardSpec.kind !== "tabMutationRunId" && typeof _guardSpec.runId === "number" && _runtime) {
      message = "parameterSet restore run " + _guardSpec.runId + " superseded by " + _runtime.parameterSetRunId;
    }
    return { ok: false, superseded: true, diagnostics: [{ code: code, message: message }] };
  }

  function hasFiniteLayout(_layout) {
    return _layout && Number.isFinite(_layout.x) && Number.isFinite(_layout.y)
      && Number.isFinite(_layout.width) && Number.isFinite(_layout.height);
  }

  function failPlace(_message) {
    return { ok: false, diagnostics: [{ code: RESTORE_FAILED, message: _message }] };
  }

  async function applyRestoredColour(_context, _widgetId, _colour, _takePayload) {
    var colourResult = await _handleSetColour(_context, {
      type: _context.actionTypes.APPLY_COLOUR,
      widgetId: _widgetId,
      payload: {
        toColour: _colour,
        widgetType: "vis",
        source: _takePayload.source,
        skipHistory: _takePayload.skipHistory,
        isHistoryReplay: _takePayload.isHistoryReplay
      }
    });
    return !!colourResult && colourResult.ok === true;
  }

  // Claims a parked shell, places it on the target tab and restores its content, layout and settings chrome.
  // Every await re-checks the run guard so a superseded run stops without touching further shells.
  async function placeSerializedWidgetEntry(_context, _entry, _targetTabId, _options) {
    var options = _options || {};
    var guard = options.guard || {};
    var widget = _entry || {};
    var diagnostics = [];
    var degraded = false;
    var entryIndex = typeof options.entryIndex === "number" ? options.entryIndex : null;
    try {
      _ensureRuntime.ensureWidgetBaseRuntime(_context._KDB);
      var runtime = _context._KDB.runtime.widgetBase;
      var kind = widget.kind;
      if (kind !== "vis" && kind !== "txt") {
        return { ok: false, diagnostics: [{ code: UNSUPPORTED, message: "unsupported widget kind \"" + String(kind) + "\"" }] };
      }
      var claim = await claimParkedShell(_context, kind, _targetTabId);
      if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
      if (!claim || claim.ok !== true || !claim.widgetId) {
        return failPlace("no parked shell available; shell-create is not supported in this tranche");
      }
      var takePayload = {
        tabId: _targetTabId,
        targetLayout: { x: widget.x, y: widget.y, width: widget.w, height: widget.h },
        reason: options.reason || "restore",
        source: options.source || "writebackSet",
        skipHistory: options.skipHistory === true,
        isHistoryReplay: options.isHistoryReplay === true
      };
      var takeResult = await _handleTakeFromLaunchpad(_context, { type: _context.actionTypes.TAKE_FROM_LAUNCHPAD, widgetId: claim.widgetId, payload: takePayload });
      if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
      if (!takeResult || takeResult.ok !== true) {
        return failPlace("takeFromLaunchpad failed for widget shell " + String(claim.widgetId));
      }
      if (kind === "vis" && widget.bgcol != null && widget.bgcol !== "") {
        var colourOk = await applyRestoredColour(_context, claim.widgetId, widget.bgcol, takePayload);
        if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
        if (!colourOk) {
          return failPlace("applyColour failed for restored vis shell " + String(claim.widgetId));
        }
      }
      var restorePayload = Object.assign({}, options.restorePayload || {}, {
        source: takePayload.source,
        skipHistory: takePayload.skipHistory,
        entryIndex: entryIndex
      });
      if (typeof guard.runId === "number") { restorePayload.runId = guard.runId; }
      var contentResult = await dispatchRestoreContentCreate(_context, kind, claim.widgetId, widget, restorePayload);
      if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
      if (contentResult && Array.isArray(contentResult.diagnostics) && contentResult.diagnostics.length) {
        diagnostics = diagnostics.concat(contentResult.diagnostics);
      }
      if (contentResult && contentResult.degraded === true) { degraded = true; }
      if (!contentResult || !contentResult.ok) {
        var contentMessage = contentResult && contentResult.message || "content create failed";
        return { ok: false, degraded: degraded || undefined, diagnostics: diagnostics.concat([{ code: RESTORE_FAILED, message: contentMessage }]) };
      }
      var layoutResult = hasFiniteLayout(takePayload.targetLayout)
        ? await _applyWidgetLayout(_context._KDB, claim.widgetId, takePayload.targetLayout)
        : { ok: false };
      if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
      if (!layoutResult || layoutResult.ok !== true) {
        diagnostics.push({ code: RESTORE_FAILED, widgetId: claim.widgetId, message: "layout re-apply after contentCreate failed" });
        degraded = true;
      }
      var placeControlsOk = await _dispatchWidgetSettingsPlaceControls(_context._KDB, {
        widgetId: claim.widgetId,
        kind: kind === "vis" ? "vis" : "text",
        shellEl: claim.shellEl,
        layout: { x: widget.x, y: widget.y, width: widget.w, height: widget.h },
        isHistoryReplay: takePayload.isHistoryReplay,
        source: takePayload.source
      });
      if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
      if (placeControlsOk !== true) {
        diagnostics.push({
          code: CHROME_DEGRADED,
          entryIndex: entryIndex,
          widgetId: claim.widgetId,
          message: "widgetSettings/placeControls failed; settings chrome missing for restored widget"
        });
        degraded = true;
      }
      return { ok: true, widgetId: claim.widgetId, degraded: degraded || undefined, diagnostics: diagnostics };
    } catch (err) {
      return { ok: false, threw: true, diagnostics: [{ code: RESTORE_FAILED, message: String(err && err.message ? err.message : err) }] };
    }
  }

  async function ensureRevealTakeTarget(_context, _revealSlot) {
    await _guardParameterSetRun.waitForInflightTraversals(_context._KDB);
    var activation = await _context._KDB.api.tabs.dispatch({
      type: "tabs/traverse",
      payload: {
        source: "tabsMutation",
        scope: "singleTab",
        tabIndex: _revealSlot.index,
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

  async function routeWidget(_context, _widgetId, _tabId, _parked, _reason, _hints) {
    var payload = { widgetId: _widgetId, tabId: _tabId, reason: _reason, isHistoryReplay: true };
    if (_hints && _hints.visualType) { payload.visualType = _hints.visualType; }
    if (_hints && _hints.isTopNHelperClaim === true) { payload.isTopNHelperClaim = true; }
    var result = await _context.dispatch({ type: _context.actionTypes.ROUTE_TO_LAUNCHPAD, widgetId: _widgetId, payload: payload });
    if (!result || result.ok !== true) { throw new Error("Failed to route widget " + _widgetId + " to launchpad."); }
    _parked.push(_widgetId);
  }

  function routeHintsForFrame(_frame) {
    if (_frame && (_frame.role === "topNHelper" || _frame.kind === "topN")) {
      return { visualType: "LIST", isTopNHelperClaim: true };
    }
    return null;
  }

  async function parkTabCanvas(_context, _tabId, _deps) {
    var frames = _context.selectors.readCanvasWidgetsByTab(_context._KDB, _tabId);
    var reason = _deps.placeOptions && _deps.placeOptions.reason;
    for (var index = 0; index < frames.length; index += 1) {
      await routeWidget(_context, frames[index].widgetId, _tabId, _deps.parked, reason, routeHintsForFrame(frames[index]));
    }
  }

  function destinationIndex(_plan, _tabId) {
    var plan = _plan || {};
    var slots = [plan.insertSlot, plan.revealSlot, plan.deletedSlot, plan.hideSlot, plan.landing];
    var moves = plan.slotMoves || [];
    var index;
    for (index = 0; index < slots.length; index += 1) {
      if (slots[index] && slots[index].tabId === _tabId && typeof slots[index].index === "number") { return slots[index].index; }
    }
    for (index = 0; index < moves.length; index += 1) {
      if (moves[index].toTabId === _tabId && typeof moves[index].toIndex === "number") { return moves[index].toIndex; }
      if (moves[index].fromTabId === _tabId && typeof moves[index].fromIndex === "number") { return moves[index].fromIndex; }
    }
    return null;
  }

  function readDiagnostic(_placeResult) {
    return _placeResult && Array.isArray(_placeResult.diagnostics) && _placeResult.diagnostics[0];
  }

  function readDiagCode(_placeResult) {
    var diag = readDiagnostic(_placeResult);
    return diag && diag.code ? diag.code : RESTORE_FAILED;
  }

  function readDiagMessage(_placeResult) {
    var diag = readDiagnostic(_placeResult);
    return diag && diag.message ? diag.message : "duplicate widget placement failed";
  }

  function supersededSlot() {
    return { ok: false, superseded: true, structural: true, created: [], degradedEntries: [] };
  }

  // Parks the tab's canvas widgets, then places each serialized row on that tab.
  // deps: { plan, parked, placeOptions, runId }.
  async function rebuildSlotFromEntries(_context, _tabId, _rows, _deps) {
    var created = [];
    var degradedEntries = [];
    var rows = Array.isArray(_rows) ? _rows : [];
    var deps = _deps || {};
    if (rows.length === 0) {
      await parkTabCanvas(_context, _tabId, deps);
      return { ok: true, created: created, degradedEntries: degradedEntries };
    }
    await ensureRevealTakeTarget(_context, { index: destinationIndex(deps.plan, _tabId), tabId: _tabId });
    if (_hasTabInnerFrame(_context._KDB, _tabId) !== true) {
      return { ok: false, structural: true, created: created, degradedEntries: degradedEntries, message: "Destination page is not inside its tab wrapper." };
    }
    await parkTabCanvas(_context, _tabId, deps);
    for (var index = 0; index < rows.length; index += 1) {
      if (_guard.isStale(_context._KDB, deps.runId)) { return supersededSlot(); }
      var row = rows[index] || {};
      var placeResult = await placeSerializedWidgetEntry(_context, row.entry, _tabId, Object.assign({}, deps.placeOptions, { entryIndex: index }));
      if (placeResult && placeResult.superseded) { return supersededSlot(); }
      if (placeResult && placeResult.threw === true) {
        return { ok: false, structural: true, created: created, degradedEntries: degradedEntries, message: readDiagMessage(placeResult) };
      }
      if (!placeResult || !placeResult.ok) {
        degradedEntries.push({ sourceWidgetId: row.sourceWidgetId, code: readDiagCode(placeResult), message: readDiagMessage(placeResult) });
        continue;
      }
      if (placeResult.degraded === true) {
        degradedEntries.push({ sourceWidgetId: row.sourceWidgetId, code: CHROME_DEGRADED, message: "duplicate widget placement degraded" });
      }
      created.push({ sourceWidgetId: row.sourceWidgetId, widgetId: placeResult.widgetId });
    }
    return { ok: true, created: created, degradedEntries: degradedEntries };
  }

  return {
    placeSerializedWidgetEntry: placeSerializedWidgetEntry,
    rebuildSlotFromEntries: rebuildSlotFromEntries
  };
});
