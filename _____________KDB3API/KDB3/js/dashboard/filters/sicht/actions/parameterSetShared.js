define([], function () {
  "use strict";

  function ack(ok, diagnostics, degraded) {
    return {
      ok: ok === true,
      degraded: degraded === true,
      diagnostics: Array.isArray(diagnostics) ? diagnostics : []
    };
  }

  function diagnostic(code, message, details) {
    var item = { code: code, message: message };
    if (details && typeof details === "object") {
      Object.keys(details).forEach(function (key) {
        item[key] = details[key];
      });
    }
    return item;
  }

  function cancelResult(runId, message) {
    return ack(false, [diagnostic("WRITEBACK_RESTORE_CANCELLED", message, { runId: runId })]);
  }

  function failResult(code, message, details) {
    return ack(false, [diagnostic(code, message, details)]);
  }

  function claimRunId(runtime, runId) {
    if (typeof runId !== "number" || !isFinite(runId)) {
      return cancelResult(runId, "parameterSet action requires numeric runId");
    }
    if (typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId) {
      return cancelResult(
        runId,
        "stale parameterSet runId " + runId + " superseded by " + runtime.parameterSetRunId
      );
    }
    runtime.parameterSetRunId = runId;
    return null;
  }

  function ensureCurrentRun(runtime, runId) {
    if (runtime.parameterSetRunId !== runId) {
      return cancelResult(
        runId,
        "parameterSet run " + runId + " superseded by " + runtime.parameterSetRunId
      );
    }
    return null;
  }

  function resolveSelectionByUse(byOption, useValue) {
    var options = byOption && typeof byOption === "object" ? byOption : null;
    var keys = options ? Object.keys(options) : [];
    var idx;
    var option;
    for (idx = 0; idx < keys.length; idx += 1) {
      option = options[keys[idx]];
      if (!option) {
        continue;
      }
      if (String(option.useValue || "") === useValue) {
        return {
          displayValue: String(option.displayValue || ""),
          useValue: String(option.useValue || "")
        };
      }
    }
    return null;
  }

  return {
    ack: ack,
    diagnostic: diagnostic,
    cancelResult: cancelResult,
    failResult: failResult,
    claimRunId: claimRunId,
    ensureCurrentRun: ensureCurrentRun,
    resolveSelectionByUse: resolveSelectionByUse
  };
});
