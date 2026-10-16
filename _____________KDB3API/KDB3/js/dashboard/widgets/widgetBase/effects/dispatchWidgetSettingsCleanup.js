define([], function () {
  function dispatchWidgetSettingsCleanup(_KDB, _request) {
    try {
      const api = _KDB && _KDB.api && _KDB.api.widgetSettings;
      const widgetId = _request && _request.widgetId;
      if (!api || typeof api.dispatch !== "function" || !widgetId) {
        return;
      }
      const result = api.dispatch({
        type: "widgetSettings/cleanupWidgetControls",
        widgetId: widgetId,
        payload: { widgetId: widgetId }
      });
      if (result && typeof result.then === "function") {
        result.catch(function (err) {
          console.error("[widgetBase.dispatchWidgetSettingsCleanup] failed", { widgetId: widgetId }, err);
        });
      }
    } catch (err) {
      console.error("[widgetBase.dispatchWidgetSettingsCleanup] failed", err);
    }
  }

  return dispatchWidgetSettingsCleanup;
});
