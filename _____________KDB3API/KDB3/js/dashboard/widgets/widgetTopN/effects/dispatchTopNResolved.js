define([], function () {
  "use strict";

  async function __controller(_KDB, _payload) {
    try {
      if (!_KDB || !_KDB.api || !_KDB.api.widgetVis || typeof _KDB.api.widgetVis.dispatch !== "function") {
        return { ok: false, terminalDispatched: false, errorCode: "WIDGET_TOPN_UNAVAILABLE_DEPENDENCY" };
      }
      var widgetVisAction = {
        type: "widgetVis/topNResolved",
        widgetId: _payload.ownerVisId,
        opSeq: _payload.opSeq,
        payload: {
          ownerVisId: _payload.ownerVisId,
          opSeq: _payload.opSeq,
          status: _payload.status,
          resultValues: _payload.resultValues || [],
          excludeItemId: _payload.excludeItemId || null,
          errorCode: _payload.errorCode || null,
          errorMessage: _payload.errorMessage || null
        }
      };
      var result = await Promise.resolve(_KDB.api.widgetVis.dispatch(widgetVisAction));
      return { ok: result && result.ok === true, terminalDispatched: true, diagnostics: result };
    } catch (err) {
      console.error("[widgetTopN.dispatchTopNResolved] failed", { ownerVisId: _payload && _payload.ownerVisId }, err);
      return {
        ok: false,
        terminalDispatched: false,
        errorCode: "WIDGET_TOPN_UNAVAILABLE_DEPENDENCY",
        errorMessage: String(err && err.message ? err.message : err)
      };
    }
  }

  return __controller;
});
