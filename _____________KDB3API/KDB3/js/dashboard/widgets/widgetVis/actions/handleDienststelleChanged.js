define([
  "../config/actionTypes.js",
  "../effects/runBindingPipeline.js",
  "../effects/normalizeHierarchySnapshot.js",
  "../effects/resolveBindingPrerequisites.js",
  "./normalizeDispatchResult.js",
  "./finalizePipelineResult.js"
], function (_actionTypes, _runBindingPipeline, _normalizeHierarchySnapshot, _resolveBindingPrerequisites, _normalizeDispatchResult, _finalizePipelineResult) {
  "use strict";

  function resolveIncomingDienststelleWaiters(_context, _payload) {
    var snapshot = _normalizeHierarchySnapshot(_payload || {});
    if (!_resolveBindingPrerequisites.isConfirmedHierarchy(snapshot)) {
      return { resolvedWidgetIds: [] };
    }
    return _resolveBindingPrerequisites.resolveDienststelleGateWaiters(_context._KDB, snapshot);
  }

  function handleDienststelleChanged(_context, _action, _options) {
    var options = _options || {};
    var payload = _action.payload || {};
    var widgetId = _action.widgetId;
    if (options.skipGateResolution !== true) {
      resolveIncomingDienststelleWaiters(_context, payload);
    }
    if (!widgetId) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        errorCode: "WIDGET_VIS_WIDGET_ID_MISSING",
        errorMessage: "dienststelleChanged requires widgetId for per-widget handling."
      }));
    }
    _context.dispatchInternal({
      type: _actionTypes.MARK_PENDING,
      widgetId: widgetId,
      payload: { kind: "dienststelle", opSeq: _action.opSeq }
    });
    return _runBindingPipeline(_context, {
      widgetId: widgetId,
      opSeq: _action.opSeq,
      reason: "dienststelle",
      metric: _context.readMetric(widgetId),
      settings: _context.readSettingsSnapshot(widgetId, payload),
      hierarchySnapshot: _normalizeHierarchySnapshot(payload),
      payload: payload
    }).then(function (result) {
      return _finalizePipelineResult(_context, _action, result, {
        defaultErrorMessage: "Dienststelle re-apply failed."
      });
    });
  }

  function broadcastDienststelleChanged(_context, _action) {
    var gateResolution = resolveIncomingDienststelleWaiters(_context, _action.payload || {});
    var skipWidgetIds = {};
    (gateResolution.resolvedWidgetIds || []).forEach(function (_widgetId) {
      skipWidgetIds[_widgetId] = true;
    });
    var visState = _context._KDB.state && _context._KDB.state.widgets
      ? _context._KDB.state.widgets.vis
      : null;
    var byId = visState && visState.byId ? visState.byId : {};
    var widgetIds = Object.keys(byId).filter(function (_widgetId) {
      return !skipWidgetIds[_widgetId];
    });
    var succeeded = 0;
    var failed = 0;
    var skipped = 0;
    if (!widgetIds.length) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: true,
        skipped: true,
        broadcast: true,
        fanOutCount: 0,
        diagnostics: { succeeded: 0, failed: 0, skipped: 0 }
      }));
    }
    return Promise.all(widgetIds.map(function (_widgetId) {
      var perWidgetAction = {
        type: _action.type,
        widgetId: _widgetId,
        opSeq: _context.ensureOpSeq(_widgetId),
        payload: _action.payload
      };
      return handleDienststelleChanged(_context, perWidgetAction, { skipGateResolution: true }).then(function (_result) {
        if (_result && _result.ok === true) {
          succeeded += 1;
        } else if (_result && (_result.skipped === true || _result.stale === true)) {
          skipped += 1;
        } else {
          failed += 1;
        }
        return _result;
      });
    })).then(function () {
      return _normalizeDispatchResult({
        ok: failed === 0 || succeeded > 0,
        broadcast: true,
        fanOutCount: widgetIds.length,
        diagnostics: {
          succeeded: succeeded,
          failed: failed,
          skipped: skipped
        }
      });
    });
  }

  return {
    handleDienststelleChanged: handleDienststelleChanged,
    broadcastDienststelleChanged: broadcastDienststelleChanged
  };
});
