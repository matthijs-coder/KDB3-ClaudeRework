define([
  "./state.js",
  "./runtime.js",
  "./results.js",
  "./binding/pipeline.js",
  "./render/postRender.js"
], function (_state, _visRuntime, _results, _bindingPipeline, _postRender) {
  "use strict";

  function dispatchTopNCleanup(_context, _widgetId, _payload) {
    var api = _context._KDB.api && _context._KDB.api.widgetTopN;
    if (!api) {
      return Promise.resolve({ ok: true, skipped: true });
    }
    var reason = _payload.reason || "cleanup";
    return Promise.resolve(api.dispatch({
      type: "widgetTopN/cleanup",
      widgetId: _widgetId,
      payload: {
        ownerVisId: _widgetId,
        reason: reason,
        clearHelperBinding: true,
        releaseClaim: reason === "remove" || reason === "destroy"
      }
    }));
  }

  function recordCleanupError(_context, _widgetId, _errorCode, _errorMessage) {
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.ERROR_RECORDED,
      widgetId: _widgetId,
      payload: { errorCode: _errorCode, errorMessage: _errorMessage }
    });
  }

  function finalizeCleanupSuccess(_context, _widgetId, _opSeq, _payload, _result, _cleanupDiagnostics) {
    var isTechnicalSettingsDeleteReset = _payload.clearBinding === true && _payload.reason === "settingsDelete";
    var isSemanticEmptyCleanup = _payload.clearBinding === true && !isTechnicalSettingsDeleteReset;
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.CLEANUP_SUCCEEDED,
      widgetId: _widgetId,
      payload: {
        derived: Object.assign({}, (_result && _result.derived) || {}, {
          topNResultValues: [],
          emptyStatus: isSemanticEmptyCleanup ? "intentional" : null,
          emptyReason: isSemanticEmptyCleanup ? (_payload.reason || "cleanup") : null
        })
      }
    });
    var normalized = _result || { ok: true, widgetId: _widgetId, opSeq: _opSeq, status: "success" };
    if (_cleanupDiagnostics) {
      normalized.diagnostics = Object.assign({}, normalized.diagnostics || {}, { cleanup: _cleanupDiagnostics });
    }
    return _results.normalizeDispatchResult(normalized);
  }

  function finishDecorationCleanup(_context, _widgetId, _opSeq, _payload, _cleanupResult, _bindingResult) {
    if (_cleanupResult && _cleanupResult.stale === true) {
      return _results.normalizeDispatchResult({ ok: false, widgetId: _widgetId, opSeq: _opSeq, stale: true, status: "aborted" });
    }
    if (!_cleanupResult || _cleanupResult.ok !== true) {
      recordCleanupError(
        _context,
        _widgetId,
        _cleanupResult && _cleanupResult.errorCode ? _cleanupResult.errorCode : "WIDGET_VIS_CLEANUP_FAILED",
        _cleanupResult && _cleanupResult.errorMessage ? _cleanupResult.errorMessage : "Visual decoration cleanup failed."
      );
      return _results.normalizeDispatchResult(_cleanupResult || {
        ok: false,
        widgetId: _widgetId,
        opSeq: _opSeq,
        errorCode: "WIDGET_VIS_CLEANUP_FAILED"
      });
    }
    var bindingResult = _bindingResult || { ok: true, widgetId: _widgetId, opSeq: _opSeq, status: "success" };
    return finalizeCleanupSuccess(_context, _widgetId, _opSeq, _payload, bindingResult, _cleanupResult.diagnostics);
  }

  function runDecorationCleanup(_context, _widgetId, _opSeq, _payload, _bindingResult) {
    return Promise.resolve(_postRender.cleanupVisualizationContent(_context._KDB, {
      widgetId: _widgetId,
      opSeq: _opSeq,
      payload: _payload,
      runtime: _visRuntime.ensureWidgetRuntime(_context._KDB, _widgetId),
      isStaleOpSeq: _context.isStaleOpSeq
    })).then(function (cleanupResult) {
      return finishDecorationCleanup(_context, _widgetId, _opSeq, _payload, cleanupResult, _bindingResult);
    });
  }

  function buildCleanupBindingInput(_context, _widgetId, _opSeq, _payload) {
    // settingsDelete rebuilds an empty binding after the clear. parameterSetReset only clears: rebinding the Cognos
    // datasource leaves a live model that rejects the later page-context filter write.
    var resetReason = _payload.reason === "settingsDelete" || _payload.reason === "parameterSetReset";
    var input = {
      widgetId: _widgetId,
      opSeq: _opSeq,
      reason: "cleanup",
      mode: "cleanup",
      metric: _context.readMetric(_widgetId),
      settings: _context.readSettingsSnapshot(_widgetId, _payload),
      payload: _payload
    };
    if (resetReason && _payload.clearBinding === true) {
      input.emptyIntent = { enabled: false, reason: null, itemId: null, value: null };
      input.resetIntent = {
        enabled: true,
        scope: "visTarget",
        clearAllSlots: true,
        clearAllLocalFilters: true,
        reason: _payload.reason
      };
      return input;
    }
    input.forceEmpty = true;
    input.emptyReason = _payload.reason || "cleanup";
    return input;
  }

  function runBindingCleanup(_context, _widgetId, _opSeq, _payload) {
    var input = buildCleanupBindingInput(_context, _widgetId, _opSeq, _payload);
    return _bindingPipeline.runBindingPipeline(_context, input).then(function (result) {
      if (result && result.stale === true) {
        return _results.normalizeDispatchResult(result);
      }
      if (result && result.ok === true) {
        return runDecorationCleanup(_context, _widgetId, _opSeq, _payload, result);
      }
      var failureCode = result && result.errorCode ? result.errorCode : "WIDGET_VIS_CLEANUP_FAILED";
      if (_payload.clearBinding === true && failureCode === "WIDGET_VIS_BINDING_APPLY_FAILED") {
        failureCode = "WIDGET_VIS_EMPTY_APPLY_FAILED";
      }
      recordCleanupError(_context, _widgetId, failureCode, result && result.errorMessage ? result.errorMessage : "Cleanup binding failed.");
      return _results.normalizeDispatchResult(Object.assign({}, result || {}, {
        ok: false,
        widgetId: _widgetId,
        opSeq: _opSeq,
        errorCode: failureCode
      }));
    });
  }

  function handleCleanupContent(_context, _action) {
    var payload = _action.payload || {};
    var widgetId = _action.widgetId;
    var opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.MARK_PENDING,
      widgetId: widgetId,
      payload: { kind: "cleanup", opSeq: opSeq }
    });
    return dispatchTopNCleanup(_context, widgetId, payload).then(function () {
      return payload.clearBinding === true
        ? runBindingCleanup(_context, widgetId, opSeq, payload)
        : runDecorationCleanup(_context, widgetId, opSeq, payload, null);
    });
  }

  return {
    handleCleanupContent: handleCleanupContent
  };
});
