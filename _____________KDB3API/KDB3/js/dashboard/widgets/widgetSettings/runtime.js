define([
  "../../../core/utils/kit/runtime.js"
], function (_kitRuntime) {
  "use strict";

  function ensureWidgetSettingsRuntime(_KDB) {
    return _kitRuntime.ensureRuntime(_KDB, "widgetSettings", { seedPlacementStarted: {} });
  }

  return {
    ensureWidgetSettingsRuntime: ensureWidgetSettingsRuntime
  };
});
