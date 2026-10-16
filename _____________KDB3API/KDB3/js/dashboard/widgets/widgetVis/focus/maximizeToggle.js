define([
  "../results.js",
  "../runtime.js",
  "../state.js",
  "./focusMode.js",
  "./observer.js"
], function (_results, _visRuntime, _state, _focusMode, _observer) {
  "use strict";

  var MAXIMIZE_FAILED = "WIDGET_VIS_MAXIMIZE_FAILED";

  function setMaximized(_context, _widgetId, _nextMaximized, _source) {
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.MAXIMIZE_SUCCEEDED,
      widgetId: _widgetId,
      payload: { nextMaximized: _nextMaximized, source: _source }
    });
  }

  function onNativeEntered(_context, _widgetId, _source) {
    if (_context.selectors.readVisMaximized(_context._KDB, _widgetId) !== true) {
      setMaximized(_context, _widgetId, true, _source || "nativeExpand");
    }
  }

  function onNativeExited(_context, _widgetId, _source) {
    if (_context.selectors.readVisMaximized(_context._KDB, _widgetId) === true) {
      setMaximized(_context, _widgetId, false, _source || "nativeCollapse");
    }
  }

  function ensureFocusObserver(_context, _widgetId, _runtime) {
    return _observer.registerFocusWidget(_context._KDB, _widgetId, _runtime, {
      readMaximized: _context.selectors.readVisMaximized.bind(null, _context._KDB, _widgetId),
      onEntered: onNativeEntered.bind(null, _context, _widgetId),
      onExited: onNativeExited.bind(null, _context, _widgetId)
    });
  }

  function resolveNextMaximized(_context, _widgetId, _payload) {
    if (_payload && typeof _payload.nextMaximized === "boolean") {
      return _payload.nextMaximized;
    }
    return _context.selectors.readVisMaximized(_context._KDB, _widgetId) !== true;
  }

  function recordMaximizeError(_context, _widgetId, _errorCode, _errorMessage) {
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.ERROR_RECORDED,
      widgetId: _widgetId,
      payload: { errorCode: _errorCode, errorMessage: _errorMessage }
    });
  }

  function finishMaximizeToggle(_context, _widgetId, _opSeq, _nextMaximized, _source, _result) {
    var errorCode = _result && _result.errorCode ? _result.errorCode : MAXIMIZE_FAILED;
    if (_context.isStaleOpSeq(_widgetId, _opSeq)) {
      return _results.normalizeDispatchResult({ ok: false, widgetId: _widgetId, opSeq: _opSeq, stale: true });
    }
    if (!_result || _result.ok !== true) {
      recordMaximizeError(_context, _widgetId, errorCode, _result && _result.errorMessage ? _result.errorMessage : "Focus mode toggle failed.");
      return _results.normalizeDispatchResult(Object.assign({}, _result || {}, {
        ok: false,
        widgetId: _widgetId,
        opSeq: _opSeq,
        errorCode: errorCode
      }));
    }
    setMaximized(_context, _widgetId, _nextMaximized, _source);
    return _results.normalizeDispatchResult({
      ok: true,
      widgetId: _widgetId,
      opSeq: _opSeq,
      status: "success",
      diagnostics: _result.diagnostics || null
    });
  }

  function failMaximizeToggle(_context, _widgetId, _opSeq, _err) {
    console.error("[widgetVis.handleMaximizeToggle] failed", _widgetId, _err);
    recordMaximizeError(_context, _widgetId, MAXIMIZE_FAILED, String(_err && _err.message ? _err.message : _err));
    return _results.normalizeDispatchResult({ ok: false, widgetId: _widgetId, opSeq: _opSeq, errorCode: MAXIMIZE_FAILED });
  }

  function handleMaximizeToggle(_context, _action) {
    var payload = _action.payload || {};
    var widgetId = _action.widgetId;
    var opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    var runtime = _visRuntime.ensureWidgetRuntime(_context._KDB, widgetId);
    var nextMaximized = resolveNextMaximized(_context, widgetId, payload);
    var source = payload.source || "user";
    var focusOptions = { source: source, waitMs: undefined };

    if (!_context.selectors.readVisRecord(_context._KDB, widgetId)) {
      return Promise.resolve(_results.normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        errorCode: "WIDGET_VIS_CONTENT_CONTEXT_MISSING"
      }));
    }
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.MARK_PENDING,
      widgetId: widgetId,
      payload: { kind: "maximize", opSeq: opSeq }
    });
    ensureFocusObserver(_context, widgetId, runtime);
    return Promise.resolve(
      nextMaximized
        ? _focusMode.enterFocusMode(_context._KDB, widgetId, runtime, focusOptions)
        : _focusMode.exitFocusMode(_context._KDB, widgetId, runtime, focusOptions)
    ).then(
      finishMaximizeToggle.bind(null, _context, widgetId, opSeq, nextMaximized, source)
    ).catch(failMaximizeToggle.bind(null, _context, widgetId, opSeq));
  }

  return {
    handleMaximizeToggle: handleMaximizeToggle,
    ensureFocusObserver: ensureFocusObserver
  };
});
