define([
  "../effects/resolveBindingPrerequisites.js",
  "./normalizeDispatchResult.js"
], function (_resolveBindingPrerequisites, _normalizeDispatchResult) {
  "use strict";

  function handleTopNResolved(_context, _action) {
    var payload = _action.payload || {};
    var widgetId = _action.widgetId;
    var opSeq = payload.opSeq != null ? payload.opSeq : _action.opSeq;
    var helperTableResult = _resolveBindingPrerequisites.mapTopNPayloadToHelper(payload);
    if (payload.ownerVisId && payload.ownerVisId !== widgetId) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        errorCode: "WIDGET_VIS_WIDGET_ID_CONFLICT"
      }));
    }
    if (_context.isStaleOpSeq(widgetId, opSeq)) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        opSeq: opSeq,
        stale: true
      }));
    }
    var resolved = _resolveBindingPrerequisites.resolveTopNGateWaiter(
      _context._KDB,
      widgetId,
      opSeq,
      helperTableResult
    );
    if (resolved) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: true,
        widgetId: widgetId,
        opSeq: opSeq,
        gateResolved: true
      }));
    }
    return Promise.resolve(_normalizeDispatchResult({
      ok: false,
      widgetId: widgetId,
      opSeq: opSeq,
      skipped: true,
      errorCode: "WIDGET_VIS_TOPN_NO_WAITER"
    }));
  }

  return handleTopNResolved;
});
