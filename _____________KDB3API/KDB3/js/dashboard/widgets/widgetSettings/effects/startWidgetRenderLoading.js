define([], function () {
  function startWidgetRenderLoading(_KDB, context) {
    try {
      const widgetId = String(context && context.widgetId || "");
      const widgetEl = context && context.widgetEl;
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      const isReplay = !!context && (context.isHistoryReplay === true || context.source === "historyReplay");
      if (!widgetId || !widgetEl || widgetEl.nodeType !== 1 || context.widgetType !== "live" || isReplay) {
        return;
      }
      if (!loading) {
        return;
      }
      loading.startLoading({
        mountEl: widgetEl,
        mountKey: "kdb-widget-render-loading-" + widgetId,
        messageKey: "chart"
      });
    } catch (err) {
      console.error("[widgetSettings.startWidgetRenderLoading] failed", { widgetId: context && context.widgetId }, err);
    }
  }

  return startWidgetRenderLoading;
});
