define([
  "./settingsPostDispatchSideEffects",
  "./applyDeveloperModeToggleVisibility",
], function (_settingsFx, _applyDeveloperModeToggleVisibility) {
  "use strict";
  function __orchestratorEffects(_KDB) {
    try {
      _settingsFx.applyControlPanelShellVisuals(_KDB);
      _settingsFx.applyWidgetChromeAlwaysClass(_KDB);
      _applyDeveloperModeToggleVisibility(_KDB);
    } catch (err) {
      console.error("[kdbControl.__orchestratorEffects]", err);
    }
  }
  return __orchestratorEffects;
});
