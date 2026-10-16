define([], function () {
  "use strict";

  // [runtime owner, history keys it replays]; the order is the registration order.
  // specialSingleSelect has no history key; replay goes through singleSelect.
  var REPLAY_KEYS_BY_OWNER = [
    ["kdbControl", ["kdbControl_settingsChange"]],
    ["header", ["header_chromeChange", "header_textChange"]],
    ["footer", ["footer_chromeChange"]],
    ["singleSelect", ["filter_singleSelect"]],
    ["sicht", ["filter_sicht"]],
    ["dienststelle", ["filter_dienststelle"]],
    ["nativeMultiSelect", ["filter_nativeMultiSelect"]],
    ["widgetBase", ["widget_canvasDrop", "widget_launchpadTransfer", "widget_layoutMove", "widget_layoutResize"]],
    ["widgetSettings", ["widgetSettings_optionSelect"]],
    ["widgetText", ["widget_textEdit"]],
    ["tabs", ["tabs_move", "tabs_delete", "tabs_duplicate", "tabs_rename"]],
  ];

  function addContribution(_map, _key, _contribution) {
    if (_contribution && typeof _contribution.apply === "function") {
      _map[_key] = _contribution;
    }
  }

  function collectReplayHandlers(_KDB) {
    var map = {};
    REPLAY_KEYS_BY_OWNER.forEach(function (entry) {
      var ownerRuntime = _KDB.runtime && _KDB.runtime[entry[0]];
      var contribution = ownerRuntime && ownerRuntime.historyReplayHandlerContribution;
      entry[1].forEach(function (key) {
        addContribution(map, key, contribution);
      });
    });
    return map;
  }

  return collectReplayHandlers;
});
