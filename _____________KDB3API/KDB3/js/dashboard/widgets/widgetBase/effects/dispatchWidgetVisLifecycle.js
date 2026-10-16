define([], function () {
  "use strict";

  // Cross-module lifecycle-aanroepen naar de widgetVis-owner via zijn
  // publieke API (patroon: dispatchWidgetSettingsCleanup). De handlers draaien
  // synchroon binnen de dispatch; fire-and-forget met .catch volstaat.
  // Zonder widgetVis-runtime/-record zijn beide acties een stille no-op.
  function dispatchToWidgetVis(_KDB, _type, _request) {
    try {
      var api = _KDB && _KDB.api && _KDB.api.widgetVis;
      var widgetId = _request && _request.widgetId;
      if (!api || typeof api.dispatch !== "function" || !widgetId) {
        return;
      }
      var result = api.dispatch({
        type: _type,
        widgetId: widgetId,
        payload: { widgetId: widgetId, reason: (_request && _request.reason) || null }
      });
      if (result && typeof result.then === "function") {
        result.catch(function (err) {
          console.error("[widgetBase.dispatchWidgetVisLifecycle] failed", { type: _type, widgetId: widgetId }, err);
        });
      }
    } catch (err) {
      console.error("[widgetBase.dispatchWidgetVisLifecycle] failed", { type: _type }, err);
    }
  }

  function dispatchWidgetVisDispose(_KDB, _request) {
    dispatchToWidgetVis(_KDB, "widgetVis/disposeWidgetRuntime", _request);
  }

  function dispatchWidgetVisEnsureObservers(_KDB, _request) {
    dispatchToWidgetVis(_KDB, "widgetVis/ensureObservers", _request);
  }

  return {
    dispatchWidgetVisDispose: dispatchWidgetVisDispose,
    dispatchWidgetVisEnsureObservers: dispatchWidgetVisEnsureObservers
  };
});
