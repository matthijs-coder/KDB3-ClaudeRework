define(["../view/moveWidgetToLaunchpad.js", "../effects/cleanupWidgetRuntime.js", "../effects/dispatchWidgetVisLifecycle.js", "./normalizeDispatchResult.js"], function (_moveWidgetToLaunchpad, _cleanupModule, _dispatchWidgetVisLifecycle, _normalizeDispatchResult) {
  const _cleanupWidgetRuntime = _cleanupModule.cleanupWidgetRuntime;
  function rollbackWidgetBaseOperation(_context, _rollbackRequest) {
    const request = _rollbackRequest || {};
    const widgetId = request.widgetId;
    _dispatchWidgetVisLifecycle.dispatchWidgetVisDispose(_context._KDB, { widgetId: widgetId, reason: "rollback" });
    _cleanupWidgetRuntime(_context._KDB, widgetId);
    return Promise.resolve(_moveWidgetToLaunchpad(_context._KDB, {
      widgetId: widgetId,
      shellEl: request.shellEl,
      slotMeta: request.slotMeta,
      slotEl: request.slotEl
    })).then(function (moveResult) {
      if (moveResult.ok !== true) {
        _context.dispatchInternal({
          type: _context.actionTypes.ERROR_RECORDED,
          widgetId: widgetId,
          payload: { errorCode: "WIDGET_BASE_ROLLBACK_FAILED", errorMessage: moveResult.errorMessage || "Rollback route-back failed." }
        });
        return _normalizeDispatchResult({ ok: false, rolledBack: false, widgetId: widgetId, errorCode: "WIDGET_BASE_ROLLBACK_FAILED", errorMessage: moveResult.errorMessage });
      }
      if (request.previousFrame) {
        _context.dispatchInternal({
          type: _context.actionTypes.REGISTER_FRAME,
          payload: { widgetId: widgetId, frame: request.previousFrame }
        });
      } else {
        _context.dispatchInternal({
          type: _context.actionTypes.ROUTE_TO_LAUNCHPAD_SUCCEEDED,
          widgetId: widgetId,
          payload: {
            launchpadPad: request.launchpadPad,
            launchpadSlotKey: request.launchpadSlotKey,
            lastCanvasLayout: request.lastCanvasLayout || null
          }
        });
      }
      return _normalizeDispatchResult({ ok: false, rolledBack: true, widgetId: widgetId, errorCode: request.errorCode || "WIDGET_BASE_DROP_FAILED" });
    });
  }
  return rollbackWidgetBaseOperation;
});
