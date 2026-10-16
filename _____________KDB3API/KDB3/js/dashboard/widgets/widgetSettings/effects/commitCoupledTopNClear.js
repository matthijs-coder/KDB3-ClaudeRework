define([
  "../state/commitWidgetSettingValue.js"
], function (_commitWidgetSettingValue) {
  "use strict";

  function __controller(_KDB, _widgetId) {
    try {
      return _commitWidgetSettingValue(_KDB, _widgetId, "topN", "none", { nextValue: "none" });
    } catch (err) {
      console.error("[widgetSettings.commitCoupledTopNClear] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  return __controller;
});
