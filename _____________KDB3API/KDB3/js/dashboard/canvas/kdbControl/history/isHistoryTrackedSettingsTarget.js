define([], function () {
  "use strict";

  var TRACKED = {
    "dashboard.width": 1,
    "dashboard.height": 1,
    "dashboard.backgroundColor": 1,
    "controlPanel.backgroundColor": 1,
    "controlPanel.buttonColor": 1,
    "controlPanel.actionButtonColor": 1,
    "controlPanel.innerBackgroundColor": 1,
    "defaults.visualization.width": 1,
    "defaults.visualization.height": 1,
    "defaults.text.width": 1,
    "defaults.text.height": 1,
    "defaults.visualizationBackgroundColor": 1,
    "defaults.textBackgroundColor": 1,
    "dashboard.areSettingsButtonsHidden": 1,
    "dashboard.isDeveloperMode": 1,
  };

  function isHistoryTrackedSettingsTarget(_target) {
    return typeof _target === "string" && TRACKED[_target] === 1;
  }

  return isHistoryTrackedSettingsTarget;
});
