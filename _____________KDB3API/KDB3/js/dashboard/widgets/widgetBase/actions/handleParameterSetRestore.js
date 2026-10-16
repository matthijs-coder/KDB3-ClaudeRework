define([
  "../state/ensureWidgetBaseRuntime.js",
  "../effects/placeSerializedWidgetEntry.js"
], function (_ensureWidgetBaseRuntime, _placeSerializedWidgetEntry) {
  "use strict";

  var RESTORE_FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var UNSUPPORTED = "WRITEBACK_WIDGET_KIND_UNSUPPORTED";
  var TAB_MISSING = "WRITEBACK_TABS_TARGET_MISSING";

  async function handleParameterSetRestore(context, action) {
    var payload = (action && action.payload) || {};
    if (typeof payload.runId !== "number") {
      return fail(null, RESTORE_FAILED, "widgetBase/parameterSetRestoreRequested requires a numeric runId");
    }
    _ensureWidgetBaseRuntime.ensureWidgetBaseRuntime(context._KDB);
    var runtime = context._KDB.runtime.widgetBase;
    if (typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId) {
      return fail(null, CANCELLED, "stale parameterSet runId " + payload.runId + " superseded by " + runtime.parameterSetRunId);
    }
    runtime.parameterSetRunId = payload.runId;
    var widgets = Array.isArray(payload.widgets) ? payload.widgets : [];
    var tabTargets = payload.tabTargets && typeof payload.tabTargets === "object" ? payload.tabTargets : {};
    var result = { ok: true, widgetCorrelation: {}, diagnostics: [] };
    var sawUnsupported = false;
    var guard = { kind: "parameterSetRunId", runId: payload.runId };

    for (var entryIndex = 0; entryIndex < widgets.length; entryIndex += 1) {
      var widget = widgets[entryIndex] || {};
      var kind = widget.kind;
      if (kind !== "vis" && kind !== "txt") {
        sawUnsupported = true;
        result.diagnostics.push({ code: UNSUPPORTED, entryIndex: entryIndex, message: "unsupported widget kind \"" + String(kind) + "\" in widget restore tranche 1" });
        continue;
      }
      var target = tabTargets[String(widget.tab)];
      if (!target || !target.tabId) {
        markEntryFailure(result, TAB_MISSING, entryIndex, "missing tab target for widget tab index " + String(widget.tab));
        continue;
      }
      var placeResult = await _placeSerializedWidgetEntry(context, widget, target.tabId, {
        guard: guard,
        reason: "restore",
        source: payload.source || "writebackSet",
        skipHistory: payload.skipHistory === true,
        isHistoryReplay: true,
        entryIndex: entryIndex,
        restorePayload: payload
      });
      if (placeResult.superseded) {
        result.ok = false;
        result.diagnostics = result.diagnostics.concat(placeResult.diagnostics || []);
        return result;
      }
      if (placeResult.threw === true) {
        return fail(result, RESTORE_FAILED, readPlaceMessage(placeResult));
      }
      if (!placeResult.ok) {
        if (placeResult.degraded === true) { result.degraded = true; }
        if (Array.isArray(placeResult.diagnostics) && placeResult.diagnostics.length) {
          result.diagnostics = result.diagnostics.concat(placeResult.diagnostics);
        }
        markEntryFailure(result, RESTORE_FAILED, entryIndex, readPlaceMessage(placeResult));
        continue;
      }
      if (placeResult.degraded === true) { result.degraded = true; }
      if (Array.isArray(placeResult.diagnostics) && placeResult.diagnostics.length) {
        result.diagnostics = result.diagnostics.concat(placeResult.diagnostics);
      }
      result.widgetCorrelation[String(entryIndex)] = { widgetId: placeResult.widgetId, kind: kind, tabIdx: widget.tab };
    }
    if (sawUnsupported) { result.degraded = true; }
    return result;
  }

  function readPlaceMessage(placeResult) {
    var diags = placeResult && Array.isArray(placeResult.diagnostics) ? placeResult.diagnostics : [];
    var diag = diags.length ? diags[diags.length - 1] : null;
    return diag && diag.message ? diag.message : "placement failed";
  }
  function markEntryFailure(result, code, entryIndex, message) { result.ok = false; result.diagnostics.push({ code: code, entryIndex: entryIndex, message: message }); }
  function fail(base, code, message) { var result = base || { ok: true, widgetCorrelation: {}, diagnostics: [] }; result.ok = false; result.diagnostics.push({ code: code, message: message }); return result; }

  return handleParameterSetRestore;
});
