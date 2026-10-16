define(["../effects/applyWidgetColour.js", "./normalizeDispatchResult.js"], function (_applyWidgetColour, _normalizeDispatchResult) {
  function handleSetColour(_context, _action) {
    const payload = (_action && _action.payload) || {};
    const widgetId = _action.widgetId;
    const opSeq = _context.ensureOpSeq(widgetId, _action.opSeq);
    const applyInput = {
      optionValue: payload.optionValue != null ? payload.optionValue : payload.toColour,
      toColour: payload.toColour,
      widgetType: payload.widgetType || payload.kind || null,
      source: payload.source || null,
      isHistoryReplay: payload.isHistoryReplay === true
    };
    return _applyWidgetColour(_context._KDB, widgetId, applyInput).then(function (colourResult) {
      if (colourResult.ok !== true) {
        return _normalizeDispatchResult({ ok: false, widgetId: widgetId, opSeq: opSeq, errorCode: colourResult.errorCode, errorMessage: colourResult.errorMessage });
      }
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return _normalizeDispatchResult({ ok: false, stale: true, widgetId: widgetId, opSeq: opSeq });
      }
      _context.dispatchInternal({ type: _context.actionTypes.REGISTER_FRAME, payload: { widgetId: widgetId, frame: { colour: colourResult.colour, lifecycle: "ready" } } });
      return _normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: opSeq, colour: colourResult.colour });
    });
  }
  return handleSetColour;
});
