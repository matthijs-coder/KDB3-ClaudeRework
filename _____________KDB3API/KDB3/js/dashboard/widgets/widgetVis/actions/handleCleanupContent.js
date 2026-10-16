define([
  "../state.js",
  "./cleanup/runDecorationCleanup.js",
  "./cleanup/runBindingCleanup.js"
], function (_state, _runDecorationCleanup, _runBindingCleanup) {
  "use strict";

  function dispatchTopNCleanup(_context, _widgetId, _payload) {
    var api = _context._KDB.api && _context._KDB.api.widgetTopN;
    if (!api || typeof api.dispatch !== "function") {
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
      if (payload.clearBinding !== true) {
        return _runDecorationCleanup(_context, widgetId, opSeq, payload, null);
      }
      return _runBindingCleanup(_context, widgetId, opSeq, payload);
    });
  }

  return handleCleanupContent;
});
