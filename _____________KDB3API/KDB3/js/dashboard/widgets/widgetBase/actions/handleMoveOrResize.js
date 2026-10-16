define([
  "../effects/applyWidgetLayout.js",
  "../effects/commitWidgetBaseHistory.js",
  "../state/normalizeWidgetLayout.js",
  "./normalizeDispatchResult.js"
], function (_applyWidgetLayout, _commitWidgetBaseHistory, _normalizeWidgetLayout, _normalizeDispatchResult) {
  function handleMoveOrResize(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    if (payload.isFinal !== true) {
      return Promise.resolve(_normalizeDispatchResult({ ok: true, widgetId: widgetId, skipped: true, reasonCode: "NON_FINAL_PREVIEW" }));
    }
    const opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    const layout = _normalizeWidgetLayout(payload.toLayout);
    return _applyWidgetLayout(_context._KDB, widgetId, layout).then(function (layoutResult) {
      if (layoutResult.ok !== true) {
        return _normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: layoutResult.errorCode, errorMessage: layoutResult.errorMessage });
      }
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return _normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq });
      }
      _context.dispatchInternal({ type: _context.actionTypes.PLACE_ON_CANVAS_SUCCEEDED, widgetId: widgetId, payload: { layout: layout } });
      maybeCommitLayoutHistory(_context, _action, widgetId, payload, layout);
      return _normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, placement: "onCanvas" });
    });
  }
  function layoutHistoryFrame(widgetId, layout) {
    const normalized = _normalizeWidgetLayout(layout);
    return { widgetId: widgetId, x: normalized.x, y: normalized.y, width: normalized.width, height: normalized.height };
  }
  function maybeCommitLayoutHistory(context, action, widgetId, payload, layout) {
    if (payload.isHistoryReplay === true) {
      return;
    }
    const key = action.type === "widgetBase/resize" ? "widget_layoutResize" : "widget_layoutMove";
    _commitWidgetBaseHistory(context._KDB, {
      key: key,
      timestamp: Date.now(),
      old: layoutHistoryFrame(widgetId, payload.fromLayout),
      new: layoutHistoryFrame(widgetId, layout),
    });
  }
  return handleMoveOrResize;
});
