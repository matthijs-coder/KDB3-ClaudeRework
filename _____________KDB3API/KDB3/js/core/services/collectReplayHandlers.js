define([], function () {
  "use strict";

  function addContribution(_map, _key, _contribution) {
    if (_contribution && typeof _contribution.apply === "function") {
      _map[_key] = _contribution;
    }
  }

  function collectReplayHandlers(_KDB) {
    var map = {};
    var kdbRt = _KDB.runtime && _KDB.runtime.kdbControl;
    var kdbContribution = kdbRt && kdbRt.historyReplayHandlerContribution;
    addContribution(map, "kdbControl_settingsChange", kdbContribution);

    var headerRt = _KDB.runtime && _KDB.runtime.header;
    var headerContribution = headerRt && headerRt.historyReplayHandlerContribution;
    addContribution(map, "header_chromeChange", headerContribution);
    addContribution(map, "header_textChange", headerContribution);

    var footerRt = _KDB.runtime && _KDB.runtime.footer;
    var footerContribution = footerRt && footerRt.historyReplayHandlerContribution;
    addContribution(map, "footer_chromeChange", footerContribution);

    var singleSelectRt = _KDB.runtime && _KDB.runtime.singleSelect;
    var singleSelectContribution =
      singleSelectRt && singleSelectRt.historyReplayHandlerContribution;
    // specialSingleSelect has no history-key; replay via singleSelect.
    addContribution(map, "filter_singleSelect", singleSelectContribution);

    var sichtRt = _KDB.runtime && _KDB.runtime.sicht;
    var sichtContribution = sichtRt && sichtRt.historyReplayHandlerContribution;
    addContribution(map, "filter_sicht", sichtContribution);

    var dienststelleRt = _KDB.runtime && _KDB.runtime.dienststelle;
    var dienststelleContribution =
      dienststelleRt && dienststelleRt.historyReplayHandlerContribution;
    addContribution(map, "filter_dienststelle", dienststelleContribution);

    var nativeMultiSelectRt = _KDB.runtime && _KDB.runtime.nativeMultiSelect;
    var nativeMultiSelectContribution =
      nativeMultiSelectRt && nativeMultiSelectRt.historyReplayHandlerContribution;
    addContribution(map, "filter_nativeMultiSelect", nativeMultiSelectContribution);

    var widgetBaseRt = _KDB.runtime && _KDB.runtime.widgetBase;
    var widgetBaseContribution =
      widgetBaseRt && widgetBaseRt.historyReplayHandlerContribution;
    addContribution(map, "widget_canvasDrop", widgetBaseContribution);
    addContribution(map, "widget_launchpadTransfer", widgetBaseContribution);
    addContribution(map, "widget_layoutMove", widgetBaseContribution);
    addContribution(map, "widget_layoutResize", widgetBaseContribution);

    var widgetSettingsRt = _KDB.runtime && _KDB.runtime.widgetSettings;
    var widgetSettingsContribution =
      widgetSettingsRt && widgetSettingsRt.historyReplayHandlerContribution;
    addContribution(map, "widgetSettings_optionSelect", widgetSettingsContribution);

    var widgetTextRt = _KDB.runtime && _KDB.runtime.widgetText;
    var widgetTextContribution =
      widgetTextRt && widgetTextRt.historyReplayHandlerContribution;
    addContribution(map, "widget_textEdit", widgetTextContribution);

    var tabsRt = _KDB.runtime && _KDB.runtime.tabs;
    var tabsContribution = tabsRt && tabsRt.historyReplayHandlerContribution;
    addContribution(map, "tabs_move", tabsContribution);
    addContribution(map, "tabs_delete", tabsContribution);
    addContribution(map, "tabs_duplicate", tabsContribution);
    addContribution(map, "tabs_rename", tabsContribution);

    return map;
  }

  return collectReplayHandlers;
});
