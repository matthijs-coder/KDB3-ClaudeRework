define([
  "../effects/widgetMoveInteraction.js",
  "./normalizeDispatchResult.js"
], function (_widgetMoveInteraction, _normalizeDispatchResult) {
  function handleMoveMode(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    const mode = _action.type === "widgetBase/enableMove"
      ? _widgetMoveInteraction.normalizeMoveMode(payload.mode || "oneShot")
      : _widgetMoveInteraction.normalizeMoveMode(payload.mode);
    const result = _widgetMoveInteraction.setMoveMode(_context._KDB, widgetId, mode, payload);
    return Promise.resolve(_normalizeDispatchResult(Object.assign({ widgetId: widgetId }, result)));
  }

  return handleMoveMode;
});
