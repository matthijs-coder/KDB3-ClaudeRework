define([
  "./state/ensureWidgetBaseRuntime.js",
  "./actions/handleRouteToLaunchpad.js",
  "./slotStock/placeEntries.js"
], function (_ensureWidgetBaseRuntime, _handleRouteToLaunchpad, _placeEntries) {
  "use strict";

  var RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";
  var RESTORE_FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var UNSUPPORTED = "WRITEBACK_WIDGET_KIND_UNSUPPORTED";
  var TAB_MISSING = "WRITEBACK_TABS_TARGET_MISSING";

  // Route hints per frame.kind so resolveLaunchpadRoute re-derives the same route (and re-registers the same
  // kind/role) the widget had originally.
  var KIND_TO_ROUTE_HINTS = {
    text: { widgetType: "WIDGET.TEXT", isTextWidget: true },
    vis: { isLiveWidget: true },
    topN: { visualType: "LIST", isTopNHelperClaim: true },
    datatable: { visualType: "LIST" },
    other: {}
  };

  // Shared stale guard of reset and restore: a lower runId than the last accepted one is cancelled.
  function acceptRunId(_context, _runId) {
    _ensureWidgetBaseRuntime.ensureWidgetBaseRuntime(_context._KDB);
    var runtime = _context._KDB.runtime.widgetBase;
    if (typeof runtime.parameterSetRunId === "number" && _runId < runtime.parameterSetRunId) {
      return { runtime: runtime, staleMessage: "stale parameterSet runId " + _runId + " superseded by " + runtime.parameterSetRunId };
    }
    runtime.parameterSetRunId = _runId;
    return { runtime: runtime, staleMessage: null };
  }

  function markFailure(_result, _code, _message, _ownerDiagnostics) {
    _result.ok = false;
    var diagnostic = { code: _code, message: _message };
    if (_ownerDiagnostics !== undefined) {
      diagnostic.ownerDiagnostics = _ownerDiagnostics;
    }
    _result.diagnostics.push(diagnostic);
  }

  function resetFailure(_baseResult, _code, _message) {
    var result = _baseResult || { ok: true, resetWidgets: [], skipped: [], diagnostics: [] };
    markFailure(result, _code, _message);
    return result;
  }

  function collectCanvasWidgetIds(_context) {
    return _context.selectors.readAllWidgetIds(_context._KDB).filter(function (widgetId) {
      var placement = _context.selectors.readPlacement(_context._KDB, widgetId);
      return placement !== undefined && placement.placement === "onCanvas";
    });
  }

  function readSubDiagnostics(_subResult) {
    if (_subResult && Array.isArray(_subResult.diagnostics) && _subResult.diagnostics.length > 0) {
      return _subResult.diagnostics;
    }
    return undefined;
  }

  async function dispatchSubOwnerReset(_context, _result, _owner, _type, _widgetIds, _payload) {
    if (_result.ok === false) {
      return;
    }
    var api = _context._KDB.api ? _context._KDB.api[_owner] : null;
    if (!api || typeof api.dispatch !== "function") {
      markFailure(_result, RESET_FAILED, "owner API \"" + _owner + "\" is not available for " + _type);
      return;
    }
    try {
      var subResult = await Promise.resolve(api.dispatch({
        type: _type,
        payload: {
          widgetIds: _widgetIds.slice(),
          source: _payload.source || "writebackSet",
          runId: _payload.runId,
          status: _payload.status,
          skipHistory: _payload.skipHistory === true
        }
      }));
      if (!subResult || subResult.ok !== true) {
        markFailure(_result, RESET_FAILED, "sub-owner reset " + _type + " failed", readSubDiagnostics(subResult));
      }
    } catch (err) {
      markFailure(_result, RESET_FAILED, "sub-owner reset " + _type + " threw: " + String(err && err.message ? err.message : err));
    }
  }

  function isResetSuperseded(_runtime, _payload, _result) {
    if (_runtime.parameterSetRunId === _payload.runId) {
      return false;
    }
    markFailure(_result, CANCELLED, "parameterSet reset run " + _payload.runId + " superseded by " + _runtime.parameterSetRunId);
    return true;
  }

  function parkOne(_context, _widgetId, _frame, _routeHints) {
    return _handleRouteToLaunchpad(_context, {
      type: _context.actionTypes.ROUTE_TO_LAUNCHPAD,
      widgetId: _widgetId,
      payload: Object.assign({
        reason: "parameterSetReset",
        sourceModule: "widgetBase",
        tabId: _frame.tabId || null,
        isHistoryReplay: false
      }, _routeHints)
    }).catch(function (err) {
      return {
        ok: false,
        widgetId: _widgetId,
        errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    });
  }

  // Parks canvas widgets through the owner routeToLaunchpad path. The "parameterSetReset" reason keeps history
  // suppressed (only "user"/"contentRequest" transfers commit history). Mutates the shared reset result.
  async function parkWidgetsForParameterSet(_context, _widgetIds, _result) {
    for (var index = 0; index < _widgetIds.length; index += 1) {
      var widgetId = _widgetIds[index];
      var frame = _context.selectors.readFrame(_context._KDB, widgetId);
      var routeHints = frame && frame.kind ? KIND_TO_ROUTE_HINTS[frame.kind] : undefined;
      if (routeHints === undefined) {
        _result.skipped.push({ widgetId: widgetId, code: "WIDGET_BASE_KIND_UNRESOLVED" });
        _result.diagnostics.push({
          code: RESET_FAILED,
          widgetId: widgetId,
          message: "cannot park widget without a resolvable launchpad route (kind: " + String(frame && frame.kind) + ")"
        });
        _result.ok = false;
        continue;
      }
      var parkResult = await parkOne(_context, widgetId, frame, routeHints);
      if (parkResult.ok === true && parkResult.skipped !== true) {
        _result.resetWidgets.push(widgetId);
      } else if (parkResult.ok === true && parkResult.skipped === true) {
        _result.skipped.push({ widgetId: widgetId, code: parkResult.reasonCode || "WIDGET_BASE_WIDGET_SKIPPED" });
      } else {
        _result.skipped.push({ widgetId: widgetId, code: parkResult.errorCode || RESET_FAILED });
        _result.diagnostics.push({
          code: RESET_FAILED,
          widgetId: widgetId,
          message: "routeToLaunchpad failed during parameterSet reset: " + String(parkResult.errorCode || "unknown")
        });
        _result.ok = false;
      }
    }
  }

  // Parks every canvas widget in its launchpad slot, then resets the sub-owners in order: widgetVis bindings,
  // widgetText content, widgetSettings committed settings. Consumes no saved v3 content and writes no history.
  async function handleParameterSetReset(_context, _action) {
    var payload = (_action && _action.payload) || {};
    if (typeof payload.runId !== "number") {
      return resetFailure(null, RESET_FAILED, "widgetBase/parameterSetResetRequested requires a numeric runId");
    }
    var accepted = acceptRunId(_context, payload.runId);
    if (accepted.staleMessage) {
      return resetFailure(null, CANCELLED, accepted.staleMessage);
    }
    var runtime = accepted.runtime;
    var widgetIds = collectCanvasWidgetIds(_context);
    var result = { ok: true, resetWidgets: [], skipped: [], diagnostics: [] };
    if (widgetIds.length === 0) {
      return result;
    }
    if (_context.isLaunchpadReady() !== true) {
      return resetFailure(result, RESET_FAILED, "launchpad is not ready; cannot park " + widgetIds.length + " widget(s)");
    }
    await dispatchSubOwnerReset(_context, result, "widgetVis", "widgetVis/parameterSetCancelBindingsRequested", widgetIds, payload);
    if (isResetSuperseded(runtime, payload, result)) { return result; }
    if (result.ok) {
      await parkWidgetsForParameterSet(_context, widgetIds, result);
      if (isResetSuperseded(runtime, payload, result)) { return result; }
    }
    await dispatchSubOwnerReset(_context, result, "widgetText", "widgetText/parameterSetResetRequested", widgetIds, payload);
    if (isResetSuperseded(runtime, payload, result)) { return result; }
    await dispatchSubOwnerReset(_context, result, "widgetSettings", "widgetSettings/parameterSetResetRequested", widgetIds, payload);
    return result;
  }

  function readPlaceMessage(_placeResult) {
    var diags = _placeResult && Array.isArray(_placeResult.diagnostics) ? _placeResult.diagnostics : [];
    var diag = diags.length ? diags[diags.length - 1] : null;
    return diag && diag.message ? diag.message : "placement failed";
  }

  function markEntryFailure(_result, _code, _entryIndex, _message) {
    _result.ok = false;
    _result.diagnostics.push({ code: _code, entryIndex: _entryIndex, message: _message });
  }

  function restoreFailure(_baseResult, _code, _message) {
    var result = _baseResult || { ok: true, widgetCorrelation: {}, diagnostics: [] };
    result.ok = false;
    result.diagnostics.push({ code: _code, message: _message });
    return result;
  }

  function appendPlaceDiagnostics(_result, _placeResult) {
    if (_placeResult.degraded === true) { _result.degraded = true; }
    if (Array.isArray(_placeResult.diagnostics) && _placeResult.diagnostics.length) {
      _result.diagnostics = _result.diagnostics.concat(_placeResult.diagnostics);
    }
  }

  // Places each saved v3 widget entry on its tab target in entry order. A superseded run stops at once; a throw
  // fails the whole restore; other entry failures are recorded and the loop continues.
  async function handleParameterSetRestore(_context, _action) {
    var payload = (_action && _action.payload) || {};
    if (typeof payload.runId !== "number") {
      return restoreFailure(null, RESTORE_FAILED, "widgetBase/parameterSetRestoreRequested requires a numeric runId");
    }
    var accepted = acceptRunId(_context, payload.runId);
    if (accepted.staleMessage) {
      return restoreFailure(null, CANCELLED, accepted.staleMessage);
    }
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
      var placeResult = await _placeEntries.placeSerializedWidgetEntry(_context, widget, target.tabId, {
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
        return restoreFailure(result, RESTORE_FAILED, readPlaceMessage(placeResult));
      }
      appendPlaceDiagnostics(result, placeResult);
      if (!placeResult.ok) {
        markEntryFailure(result, RESTORE_FAILED, entryIndex, readPlaceMessage(placeResult));
        continue;
      }
      result.widgetCorrelation[String(entryIndex)] = { widgetId: placeResult.widgetId, kind: kind, tabIdx: widget.tab };
    }
    if (sawUnsupported) { result.degraded = true; }
    return result;
  }

  return {
    handleParameterSetReset: handleParameterSetReset,
    handleParameterSetRestore: handleParameterSetRestore
  };
});
