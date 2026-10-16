define([], function () {
  "use strict";

  function __controller(_context, _widgetId) {
    try {
      var kdb = _context && _context._KDB;
      var api = kdb && kdb.api ? kdb.api.widgetTopN : null;
      if (!api || typeof api.getState !== "function" || typeof api.dispatch !== "function") {
        return Promise.resolve({ ok: true, skipped: true });
      }
      var state = api.getState();
      if (!state || typeof state !== "object") {
        return Promise.resolve({ ok: true, skipped: true });
      }
      var record = state.byOwner ? state.byOwner[_widgetId] : null;
      var status = record && record.resolutionStatus;
      if (status !== "pending" && status !== "success" && status !== "error") {
        return Promise.resolve({ ok: true, skipped: true });
      }
      return Promise.resolve(api.dispatch({
        type: "widgetTopN/cleanup",
        widgetId: _widgetId,
        payload: {
          ownerVisId: _widgetId,
          reason: "cleanup",
          clearHelperBinding: true,
          releaseClaim: false
        }
      })).then(plainObjectResult, skippedAfterRejection.bind(null, _widgetId));
    } catch (err) {
      console.error("[widgetVis.dispatchTopNCleanupWhenDimensionAbsent] failed", _widgetId, err);
      return Promise.resolve({ ok: true, skipped: true });
    }
  }

  function plainObjectResult(_result) {
    try {
      if (_result && typeof _result === "object" && !Array.isArray(_result)) {
        return _result;
      }
      return { ok: true };
    } catch (err) {
      console.error("[widgetVis.dispatchTopNCleanupWhenDimensionAbsent] failed", err);
      return { ok: true, skipped: true };
    }
  }

  function skippedAfterRejection(_widgetId, _err) {
    try {
      console.error("[widgetVis.dispatchTopNCleanupWhenDimensionAbsent] failed", _widgetId, _err);
      return { ok: true, skipped: true };
    } catch (err) {
      return { ok: true, skipped: true };
    }
  }

  return __controller;
});
