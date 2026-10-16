define([
  "../runtime/initializeRuntime.js",
  "./parameterSetRestoreBatchCommits.js"
], function (_initializeRuntime, _batchCommits) {
  "use strict";

  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var VIS_KEYS = { tab: 1, x: 1, y: 1, w: 1, h: 1, kind: 1, code: 1, type: 1, dim: 1, topn: 1, vals: 1, grp: 1, iter: 1, wzbar: 1, vcap: 1, bgcol: 1, ctcol: 1 };
  var TXT_KEYS = { tab: 1, x: 1, y: 1, w: 1, h: 1, kind: 1, text: 1, fsize: 1, bgcol: 1, style: 1 };

  async function handleParameterSetRestoreBatch(_KDB, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    var applied = [];
    var skipped = [];
    var degraded = false;
    if (typeof payload.runId !== "number") {
      return fail(FAILED, diagnostics, "widgetSettings/parameterSetRestoreBatchRequested requires a numeric runId");
    }
    var runtime = _initializeRuntime(_KDB);
    if (typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId) {
      return cancelled(payload.runId, runtime.parameterSetRunId, diagnostics, applied, skipped);
    }
    runtime.parameterSetRunId = payload.runId;
    if (!payload.widgetCorrelation || typeof payload.widgetCorrelation !== "object") {
      return fail(FAILED, diagnostics, "widgetCorrelation is required for widgetSettings parameter set restore");
    }
    var widgets = Array.isArray(payload.widgets) ? payload.widgets : [];
    for (var idx = 0; idx < widgets.length; idx += 1) {
      if (runtime.parameterSetRunId !== payload.runId) {
        return cancelled(payload.runId, runtime.parameterSetRunId, diagnostics, applied, skipped);
      }
      var entry = widgets[idx] || {};
      var entryIndex = String(idx);
      var corr = payload.widgetCorrelation[entryIndex];
      if (!corr || !corr.widgetId) {
        skipped.push({ entryIndex: entryIndex, code: FAILED });
        diagnostics.push({ code: FAILED, entryIndex: entryIndex, message: "Missing widget correlation for entry." });
        degraded = true;
        continue;
      }
      var widgetId = String(corr.widgetId);
      if (reportUnsupportedKeys(entry, entry.kind, entryIndex, diagnostics)) {
        degraded = true;
      }
      var meta = { source: "writebackSet", runId: payload.runId, skipHistory: true, isParameterSetRestore: true };
      if (entry.kind === "vis") {
        var visResult = await _batchCommits.commitVisAndConsequences(_KDB, widgetId, entry, meta, diagnostics, entryIndex);
        if (!visResult.ok) {
          return fail(FAILED, diagnostics, "Vis-setting consequence failed.", applied, skipped);
        }
      } else if (entry.kind === "txt") {
        var txtResult = await _batchCommits.commitTxtAndConsequences(_KDB, widgetId, entry, meta, diagnostics, entryIndex);
        if (!txtResult.ok) {
          return fail(FAILED, diagnostics, "Text-setting consequence failed.", applied, skipped);
        }
      } else {
        skipped.push({ entryIndex: entryIndex, code: "WRITEBACK_WIDGET_KIND_UNSUPPORTED" });
        diagnostics.push({ code: "WRITEBACK_WIDGET_KIND_UNSUPPORTED", entryIndex: entryIndex, message: "Unsupported widget kind for settings restore." });
        degraded = true;
        continue;
      }
      if (runtime.parameterSetRunId !== payload.runId) {
        return cancelled(payload.runId, runtime.parameterSetRunId, diagnostics, applied, skipped);
      }
      if (applied.indexOf(widgetId) === -1) {
        applied.push(widgetId);
      }
    }
    return { ok: true, degraded: degraded, applied: applied, skipped: skipped, diagnostics: diagnostics };
  }
  function reportUnsupportedKeys(_entry, _kind, _entryIndex, _diagnostics) {
    var allowed = _kind === "txt" ? TXT_KEYS : VIS_KEYS;
    var sawUnsupported = false;
    Object.keys(_entry || {}).forEach(function (key) {
      if (!allowed[key]) {
        sawUnsupported = true;
        _diagnostics.push({
          code: FAILED,
          entryIndex: _entryIndex,
          setting: key,
          message: "Unsupported setting key for widgetSettings restore: " + key
        });
      }
    });
    return sawUnsupported;
  }

  function fail(_code, _diagnostics, _message, _applied, _skipped) {
    _diagnostics.push({ code: _code, message: _message });
    return { ok: false, applied: _applied || [], skipped: _skipped || [], diagnostics: _diagnostics };
  }

  function cancelled(_runId, _activeRunId, _diagnostics, _applied, _skipped) {
    _diagnostics.push({ code: CANCELLED, message: "stale parameterSet runId " + _runId + " superseded by " + _activeRunId });
    return { ok: false, applied: _applied || [], skipped: _skipped || [], diagnostics: _diagnostics };
  }

  return handleParameterSetRestoreBatch;
});
