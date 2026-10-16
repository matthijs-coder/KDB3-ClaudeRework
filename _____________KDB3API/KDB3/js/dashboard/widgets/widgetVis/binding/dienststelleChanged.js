define([
  "./gates.js",
  "./pipeline.js",
  "../results.js",
  "../state.js",
  "../../widgetBase/state/selectors.js"
], function (_gates, _pipeline, _results, _state, _baseSelectors) {
  "use strict";

  var BROADCAST_PLACEMENTS = ["onCanvas", "inLaunchpad"];

  function resolveIncomingDienststelleWaiters(_context, _payload) {
    var snapshot = _gates.normalizeHierarchySnapshot(_payload || {});
    if (!_gates.isConfirmedHierarchy(snapshot)) {
      return { resolvedWidgetIds: [] };
    }
    return _gates.resolveDienststelleGateWaiters(_context._KDB, snapshot);
  }

  async function handleDienststelleChanged(_context, _action, _options) {
    var options = _options || {};
    var payload = _action.payload || {};
    var widgetId = _action.widgetId;
    var result;
    if (options.skipGateResolution !== true) {
      resolveIncomingDienststelleWaiters(_context, payload);
    }
    if (!widgetId) {
      return _results.normalizeDispatchResult({
        ok: false,
        errorCode: "WIDGET_VIS_WIDGET_ID_MISSING",
        errorMessage: "dienststelleChanged requires widgetId for per-widget handling."
      });
    }
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.MARK_PENDING,
      widgetId: widgetId,
      payload: { kind: "dienststelle", opSeq: _action.opSeq }
    });
    result = await _pipeline.runBindingPipeline(_context, {
      widgetId: widgetId,
      opSeq: _action.opSeq,
      reason: "dienststelle",
      metric: _context.readMetric(widgetId),
      settings: _context.readSettingsSnapshot(widgetId, payload),
      hierarchySnapshot: _gates.normalizeHierarchySnapshot(payload),
      payload: payload
    });
    return _results.finalizePipelineResult(_context, _action, result, { defaultErrorMessage: "Dienststelle re-apply failed." });
  }

  // Removed and disposed widgets keep no frame (or a disposed one); parked widgets are rebound too because
  // taking a widget back from the launchpad does not rebind it.
  function isBroadcastTarget(_KDB, _widgetId) {
    var frame = _baseSelectors.readFrame(_KDB, _widgetId);
    return !!frame && frame.kind === "vis" && frame.lifecycle !== "disposed" && BROADCAST_PLACEMENTS.indexOf(frame.placement) !== -1;
  }

  async function broadcastDienststelleChanged(_context, _action) {
    var gateResolution = resolveIncomingDienststelleWaiters(_context, _action.payload || {});
    var skipWidgetIds = gateResolution.resolvedWidgetIds || [];
    var visState = _context._KDB.state && _context._KDB.state.widgets ? _context._KDB.state.widgets.vis : null;
    var byId = visState && visState.byId ? visState.byId : {};
    var widgetIds = Object.keys(byId).filter(function (_widgetId) {
      return skipWidgetIds.indexOf(_widgetId) === -1 && isBroadcastTarget(_context._KDB, _widgetId);
    });
    var succeeded = 0;
    var failed = 0;
    var skipped = 0;
    if (!widgetIds.length) {
      return _results.normalizeDispatchResult({
        ok: true,
        skipped: true,
        broadcast: true,
        fanOutCount: 0,
        diagnostics: { succeeded: 0, failed: 0, skipped: 0 }
      });
    }
    await Promise.all(widgetIds.map(async function (_widgetId) {
      var result = await handleDienststelleChanged(_context, {
        type: _action.type,
        widgetId: _widgetId,
        opSeq: _context.ensureOpSeq(_widgetId),
        payload: _action.payload
      }, { skipGateResolution: true });
      if (result && result.ok === true) {
        succeeded += 1;
      } else if (result && (result.skipped === true || result.stale === true)) {
        skipped += 1;
      } else {
        failed += 1;
      }
    }));
    return _results.normalizeDispatchResult({
      ok: failed === 0 || succeeded > 0,
      broadcast: true,
      fanOutCount: widgetIds.length,
      diagnostics: { succeeded: succeeded, failed: failed, skipped: skipped }
    });
  }

  return {
    handleDienststelleChanged: handleDienststelleChanged,
    broadcastDienststelleChanged: broadcastDienststelleChanged
  };
});
