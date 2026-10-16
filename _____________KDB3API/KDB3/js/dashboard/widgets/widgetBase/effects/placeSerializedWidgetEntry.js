define([
  "../state/ensureWidgetBaseRuntime.js",
  "./dispatchRestoreContentCreate.js",
  "./dispatchWidgetSettingsPlaceControls.js",
  "../actions/resolveDropClaim.js",
  "../actions/handleTakeFromLaunchpad.js",
  "../actions/handleSetColour.js",
  "../effects/applyWidgetLayout.js"
], function (_ensureRuntime, _dispatchRestoreContentCreate, _dispatchWidgetSettingsPlaceControls, _resolveDropClaim, _handleTakeFromLaunchpad, _handleSetColour, _applyWidgetLayout) {
  "use strict";

  var RESTORE_FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var MUTATION_CANCELLED = "TABS_MUTATION_CANCELLED";
  var UNSUPPORTED = "WRITEBACK_WIDGET_KIND_UNSUPPORTED";

  async function placeSerializedWidgetEntry(_context, _entry, _targetTabId, _options) {
    var options = _options || {};
    var guard = options.guard || {};
    var widget = _entry || {};
    var diagnostics = [];
    var degraded = false;
    try {
      _ensureRuntime.ensureWidgetBaseRuntime(_context._KDB);
      var runtime = _context._KDB.runtime.widgetBase;
      var kind = widget.kind;
      if (kind !== "vis" && kind !== "txt") {
        return { ok: false, diagnostics: [{ code: UNSUPPORTED, message: "unsupported widget kind \"" + String(kind) + "\"" }] };
      }
      var claim = await claimParkedShell(_context, kind, _targetTabId);
      if (isSuperseded(runtime, guard)) {
        return supersededResult(guard, runtime);
      }
      if (!claim || claim.ok !== true || !claim.widgetId) {
        return { ok: false, diagnostics: [{ code: RESTORE_FAILED, message: "no parked shell available; shell-create is not supported in this tranche" }] };
      }
      var takePayload = {
        tabId: _targetTabId,
        targetLayout: { x: widget.x, y: widget.y, width: widget.w, height: widget.h },
        reason: options.reason || "restore",
        source: options.source || "writebackSet",
        skipHistory: options.skipHistory === true,
        isHistoryReplay: options.isHistoryReplay === true
      };
      var takeResult = await _handleTakeFromLaunchpad(_context, {
        type: _context.actionTypes.TAKE_FROM_LAUNCHPAD,
        widgetId: claim.widgetId,
        payload: takePayload
      });
      if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
      if (!takeResult || takeResult.ok !== true) {
        return { ok: false, diagnostics: [{ code: RESTORE_FAILED, message: "takeFromLaunchpad failed for widget shell " + String(claim.widgetId) }] };
      }
      if (kind === "vis" && widget.bgcol != null && widget.bgcol !== "") {
        var colourResult = await _handleSetColour(_context, {
          type: _context.actionTypes.APPLY_COLOUR,
          widgetId: claim.widgetId,
          payload: {
            toColour: widget.bgcol,
            widgetType: "vis",
            source: takePayload.source,
            skipHistory: takePayload.skipHistory,
            isHistoryReplay: takePayload.isHistoryReplay
          }
        });
        if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
        if (!colourResult || colourResult.ok !== true) {
          return { ok: false, diagnostics: [{ code: RESTORE_FAILED, message: "applyColour failed for restored vis shell " + String(claim.widgetId) }] };
        }
      }
      var restorePayload = Object.assign({}, options.restorePayload || {}, {
        source: takePayload.source,
        skipHistory: takePayload.skipHistory,
        entryIndex: typeof options.entryIndex === "number" ? options.entryIndex : null
      });
      if (typeof guard.runId === "number") { restorePayload.runId = guard.runId; }
      var contentResult = await _dispatchRestoreContentCreate(_context, kind, claim.widgetId, widget, restorePayload);
      if (isSuperseded(runtime, guard)) { return supersededResult(guard, runtime); }
      if (contentResult && Array.isArray(contentResult.diagnostics) && contentResult.diagnostics.length) {
        diagnostics = diagnostics.concat(contentResult.diagnostics);
      }
      if (contentResult && contentResult.degraded === true) { degraded = true; }
      if (!contentResult || !contentResult.ok) {
        return { ok: false, degraded: degraded || undefined, diagnostics: diagnostics.concat([{ code: RESTORE_FAILED, message: contentResult && contentResult.message || "content create failed" }]) };
      }
      var layoutResult = takePayload.targetLayout
        && Number.isFinite(takePayload.targetLayout.x)
        && Number.isFinite(takePayload.targetLayout.y)
        && Number.isFinite(takePayload.targetLayout.width)
        && Number.isFinite(takePayload.targetLayout.height)
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
          code: "WRITEBACK_SETTINGS_CHROME_DEGRADED",
          entryIndex: typeof options.entryIndex === "number" ? options.entryIndex : null,
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

  function claimParkedShell(context, kind, tabId) {
    return _resolveDropClaim(context, {
      draggedElementType: kind === "vis" ? "visualization" : "text",
      sourceKind: kind === "vis" ? "metricsTreeLeaf" : "toolboxTextButton",
      tabId: tabId
    });
  }

  function isSuperseded(runtime, guard) {
    if (!guard || typeof guard.runId !== "number") { return false; }
    var key = guard.kind === "tabMutationRunId" ? "tabMutationRunId" : "parameterSetRunId";
    return runtime[key] !== guard.runId;
  }

  function supersededResult(guard, runtime) {
    var code = guard && guard.kind === "tabMutationRunId" ? MUTATION_CANCELLED : CANCELLED;
    var message = "placement run superseded";
    if (guard && guard.kind !== "tabMutationRunId" && typeof guard.runId === "number" && runtime) {
      message = "parameterSet restore run " + guard.runId + " superseded by " + runtime.parameterSetRunId;
    }
    return {
      ok: false,
      superseded: true,
      diagnostics: [{ code: code, message: message }]
    };
  }

  return placeSerializedWidgetEntry;
});
