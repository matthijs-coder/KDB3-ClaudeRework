define([
  "../state/ensureWidgetBaseRuntime.js",
  "../effects/parkWidgetsForParameterSet.js",
], function (_ensureWidgetBaseRuntime, _parkWidgetsForParameterSet) {
  "use strict";

  var RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";

  // Owner-backed widget reset per contracts/widgetBase-parameterSetReset-contractdelta.md.
  // Parks every canvas widget in its launchpad slot and coordinates sub-owner
  // resets (widgetVis bindings, widgetText content, widgetSettings committed
  // settings). Consumes no saved v3 content and writes no history.
  async function handleParameterSetReset(context, action) {
    const payload = (action && action.payload) || {};
    if (typeof payload.runId !== "number") {
      return failure(null, RESET_FAILED, "widgetBase/parameterSetResetRequested requires a numeric runId");
    }
    _ensureWidgetBaseRuntime.ensureWidgetBaseRuntime(context._KDB);
    const runtime = context._KDB.runtime.widgetBase;
    if (typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId) {
      return failure(null, CANCELLED, "stale parameterSet runId " + payload.runId + " superseded by " + runtime.parameterSetRunId);
    }
    runtime.parameterSetRunId = payload.runId;

    const widgetIds = collectCanvasWidgetIds(context);
    const result = { ok: true, resetWidgets: [], skipped: [], diagnostics: [] };
    if (widgetIds.length === 0) {
      return result;
    }
    if (context.isLaunchpadReady() !== true) {
      return failure(result, RESET_FAILED, "launchpad is not ready; cannot park " + widgetIds.length + " widget(s)");
    }

    await dispatchSubOwnerReset(context, result, "widgetVis", "widgetVis/parameterSetCancelBindingsRequested", widgetIds, payload);
    if (isSuperseded(runtime, payload, result)) { return result; }

    if (result.ok) {
      await _parkWidgetsForParameterSet(context, widgetIds, result);
      if (isSuperseded(runtime, payload, result)) { return result; }
    }

    await dispatchSubOwnerReset(context, result, "widgetText", "widgetText/parameterSetResetRequested", widgetIds, payload);
    if (isSuperseded(runtime, payload, result)) { return result; }
    await dispatchSubOwnerReset(context, result, "widgetSettings", "widgetSettings/parameterSetResetRequested", widgetIds, payload);
    return result;
  }

  function collectCanvasWidgetIds(context) {
    return context.selectors.readAllWidgetIds(context._KDB).filter(function (widgetId) {
      const placement = context.selectors.readPlacement(context._KDB, widgetId);
      return placement !== undefined && placement.placement === "onCanvas";
    });
  }

  async function dispatchSubOwnerReset(context, result, owner, type, widgetIds, payload) {
    if (result.ok === false) {
      return;
    }
    const api = context._KDB.api ? context._KDB.api[owner] : null;
    if (!api || typeof api.dispatch !== "function") {
      markFailure(result, RESET_FAILED, "owner API \"" + owner + "\" is not available for " + type);
      return;
    }
    try {
      const subResult = await Promise.resolve(api.dispatch({
        type: type,
        payload: {
          widgetIds: widgetIds.slice(),
          source: payload.source || "writebackSet",
          runId: payload.runId,
          status: payload.status,
          skipHistory: payload.skipHistory === true,
        },
      }));
      if (!subResult || subResult.ok !== true) {
        markFailure(result, RESET_FAILED, "sub-owner reset " + type + " failed", readSubDiagnostics(subResult));
      }
    } catch (err) {
      markFailure(result, RESET_FAILED, "sub-owner reset " + type + " threw: " + String(err && err.message ? err.message : err));
    }
  }

  function readSubDiagnostics(subResult) {
    if (subResult && Array.isArray(subResult.diagnostics) && subResult.diagnostics.length > 0) {
      return subResult.diagnostics;
    }
    return undefined;
  }

  function isSuperseded(runtime, payload, result) {
    if (runtime.parameterSetRunId === payload.runId) {
      return false;
    }
    markFailure(result, CANCELLED, "parameterSet reset run " + payload.runId + " superseded by " + runtime.parameterSetRunId);
    return true;
  }

  function markFailure(result, code, message, ownerDiagnostics) {
    result.ok = false;
    const diagnostic = { code: code, message: message };
    if (ownerDiagnostics !== undefined) {
      diagnostic.ownerDiagnostics = ownerDiagnostics;
    }
    result.diagnostics.push(diagnostic);
  }

  function failure(baseResult, code, message) {
    const result = baseResult || { ok: true, resetWidgets: [], skipped: [], diagnostics: [] };
    markFailure(result, code, message);
    return result;
  }

  return handleParameterSetReset;
});
