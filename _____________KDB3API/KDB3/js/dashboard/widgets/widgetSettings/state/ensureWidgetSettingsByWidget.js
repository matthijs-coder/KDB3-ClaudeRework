define([], function () {
  "use strict";

  function ensureWidgetSettingsByWidget(_KDB, _widgetId) {
    try {
      const widgetId = String(_widgetId || "");
      const settings = _KDB.state.widgets.settings;
      settings.byWidget = settings.byWidget || {};
      if (!settings.byWidget[widgetId]) {
        settings.byWidget[widgetId] = {
          pending: { kind: null },
          deferred: {},
          errorCode: null,
          errorMessage: null
        };
      }
      const record = settings.byWidget[widgetId];
      record.pending = record.pending || { kind: null };
      record.deferred = record.deferred || {};
      return record;
    } catch (err) {
      console.error("[widgetSettings.ensureWidgetSettingsByWidget] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  return ensureWidgetSettingsByWidget;
});
