define([], function () {
  "use strict";

  const READINESS_TIMEOUT_MS = 3000;

  async function waitForVisualContentReady(_KDB, _widgetId) {
    const widgetId = String(_widgetId || "");
    const api = _KDB && _KDB.api ? _KDB.api.widgetVis : null;
    if (!api || typeof api.dispatch !== "function") {
      return { ok: false, errorCode: "WIDGET_SETTINGS_WIDGET_VIS_API_MISSING" };
    }
    try {
      const result = await Promise.resolve(api.dispatch({
        type: "widgetVis/waitUntilContentReady",
        widgetId: widgetId,
        payload: { timeoutMs: READINESS_TIMEOUT_MS }
      }));
      if (result && result.ok === true) {
        return { ok: true };
      }
      return {
        ok: false,
        errorCode: result && result.errorCode ? result.errorCode : "WIDGET_SETTINGS_READINESS_FAILED"
      };
    } catch (err) {
      console.error("[widgetSettings.waitForVisualContentReady] failed", { widgetId: widgetId }, err);
      return { ok: false, errorCode: "WIDGET_SETTINGS_READINESS_DISPATCH_ERROR" };
    }
  }

  return waitForVisualContentReady;
});
