define([
  "./actions/handleApplySetting.js",
  "./actions/handleApplyStartupSettings.js"
], function (_handleApplySetting, _handleApplyStartupSettings) {
  "use strict";

  return {
    handleApplySetting: _handleApplySetting,
    handleApplyStartupSettings: _handleApplyStartupSettings.handleApplyStartupSettings
  };
});
