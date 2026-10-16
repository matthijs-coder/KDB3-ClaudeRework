define([
  "../effects/cleanupWidgetRuntime.js",
  "../effects/commitWidgetBaseHistory.js",
  "../effects/dispatchWidgetVisLifecycle.js",
  "../view/resolveWidgetShell.js",
  "./normalizeDispatchResult.js"
], function (_cleanupModule, _commitWidgetBaseHistory, _dispatchWidgetVisLifecycle, _shellModule, _normalizeDispatchResult) {
  const _cleanupWidgetRuntime = _cleanupModule.cleanupWidgetRuntime;

  function handleRemove(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    if (!widgetId) {
      return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING" }));
    }
    _dispatchWidgetVisLifecycle.dispatchWidgetVisDispose(_context._KDB, { widgetId: widgetId, reason: "remove" });
    detachShell(_context._KDB, widgetId);
    _cleanupWidgetRuntime(_context._KDB, widgetId);
    _context.dispatchInternal({ type: _context.actionTypes.REMOVE_SUCCEEDED, widgetId: widgetId });
    if (payload.reason === "user" && payload.isHistoryReplay !== true) {
      _commitWidgetBaseHistory(_context._KDB, { key: "widget_removed", timestamp: Date.now(), old: { widgetId: widgetId, placement: "onCanvas" }, new: { widgetId: widgetId, placement: "removed" } });
    }
    return Promise.resolve(_normalizeDispatchResult({ ok: true, widgetId: widgetId, placement: "removed" }));
  }

  function detachShell(_KDB, widgetId) {
    const shellEl = _shellModule.resolveWidgetShell(_KDB, widgetId);
    if (shellEl && shellEl.parentNode) {
      shellEl.parentNode.removeChild(shellEl);
    }
  }

  return handleRemove;
});
