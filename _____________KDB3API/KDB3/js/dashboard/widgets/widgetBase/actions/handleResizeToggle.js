define([
  "../effects/widgetResizeInteraction.js",
  "./normalizeDispatchResult.js"
], function (_widgetResizeInteraction, _normalizeDispatchResult) {
  function handleResizeToggle(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    const widgetType = payload.widgetType === "text" ? "text" : "live";
    const enabled = payload.enabled !== false;
    const result = enabled
      ? _widgetResizeInteraction.setResizeEnabled(_context._KDB, widgetId, true, widgetType)
      : _widgetResizeInteraction.disableResizeMode(_context._KDB, widgetId);
    return Promise.resolve(_normalizeDispatchResult(Object.assign({ widgetId: widgetId }, result)));
  }

  return handleResizeToggle;
});
