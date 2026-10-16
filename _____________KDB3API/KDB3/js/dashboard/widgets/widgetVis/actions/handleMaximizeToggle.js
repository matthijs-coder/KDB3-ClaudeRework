define([
  "../config/actionTypes.js",
  "../runtime/ensureWidgetRuntime.js",
  "../effects/widgetFocusMode.js",
  "./normalizeDispatchResult.js",
  "./ensureFocusObserver.js"
], function (_actionTypes, _ensureWidgetRuntime, _widgetFocusMode, _normalizeDispatchResult, _ensureFocusObserver) {
  "use strict";

  function resolveNextMaximized(_context, _widgetId, _payload) {
    if (_payload && typeof _payload.nextMaximized === "boolean") {
      return _payload.nextMaximized;
    }
    return _context.selectors.readVisMaximized(_context._KDB, _widgetId) !== true;
  }

  function handleMaximizeToggle(_context, _action) {
    var payload = _action.payload || {};
    var widgetId = _action.widgetId;
    var opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    var runtime = _ensureWidgetRuntime(_context._KDB, widgetId);
    var nextMaximized = resolveNextMaximized(_context, widgetId, payload);
    var source = payload.source || "user";
    var focusOptions = { source: source, waitMs: undefined };

    if (!_context.selectors.readVisRecord(_context._KDB, widgetId)) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        errorCode: "WIDGET_VIS_CONTENT_CONTEXT_MISSING"
      }));
    }

    _context.dispatchInternal({
      type: _actionTypes.MARK_PENDING,
      widgetId: widgetId,
      payload: { kind: "maximize", opSeq: opSeq }
    });

    _ensureFocusObserver(_context, widgetId, runtime);

    return Promise.resolve(
      nextMaximized
        ? _widgetFocusMode.enterFocusMode(_context._KDB, widgetId, runtime, focusOptions)
        : _widgetFocusMode.exitFocusMode(_context._KDB, widgetId, runtime, focusOptions)
    ).then(function (result) {
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return _normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, stale: true });
      }
      if (!result || result.ok !== true) {
        _context.dispatchInternal({
          type: _actionTypes.ERROR_RECORDED,
          widgetId: widgetId,
          payload: {
            errorCode: result && result.errorCode ? result.errorCode : "WIDGET_VIS_MAXIMIZE_FAILED",
            errorMessage: result && result.errorMessage ? result.errorMessage : "Focus mode toggle failed."
          }
        });
        return _normalizeDispatchResult(Object.assign({}, result || {}, {
          ok: false,
          widgetId: widgetId,
          opSeq: opSeq,
          errorCode: result && result.errorCode ? result.errorCode : "WIDGET_VIS_MAXIMIZE_FAILED"
        }));
      }
      _context.dispatchInternal({
        type: _actionTypes.MAXIMIZE_SUCCEEDED,
        widgetId: widgetId,
        payload: { nextMaximized: nextMaximized, source: source }
      });
      return _normalizeDispatchResult({
        ok: true,
        widgetId: widgetId,
        opSeq: opSeq,
        status: "success",
        diagnostics: result.diagnostics || null
      });
    }).catch(function (err) {
      console.error("[widgetVis.handleMaximizeToggle] failed", widgetId, err);
      _context.dispatchInternal({
        type: _actionTypes.ERROR_RECORDED,
        widgetId: widgetId,
        payload: {
          errorCode: "WIDGET_VIS_MAXIMIZE_FAILED",
          errorMessage: String(err && err.message ? err.message : err)
        }
      });
      return _normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        errorCode: "WIDGET_VIS_MAXIMIZE_FAILED"
      });
    });
  }

  return handleMaximizeToggle;
});
