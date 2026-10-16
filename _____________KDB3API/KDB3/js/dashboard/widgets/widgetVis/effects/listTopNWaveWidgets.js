define([
  "../../widgetBase/state/selectors.js",
  "../../../tabs/state/selectors.js",
  "../../../../core/services/widgetBindingPlan/defaults/normalizeDefaultValue.js",
  "./gates/topNGateWaiters.js"
], function (_baseSelectors, _tabsSelectors, _normalizeDefaultValue, _waiters) {
  "use strict";

  function __controller(_KDB, _readSettings, _scopeType, _tabId) {
    if (_scopeType === "pageContext") {
      return { widgetIds: qualifyFrames(_KDB, _readSettings, _baseSelectors.readCanvasWidgetsByTab(_KDB, _tabId)), hiddenTabIds: [] };
    }
    return splitGlobal(_KDB, _readSettings);
  }

  function splitGlobal(_KDB, _readSettings) {
    var ids = _baseSelectors.readAllWidgetIds(_KDB);
    var activeTabId = _tabsSelectors.readActiveTabId(_KDB);
    var widgetIds = [];
    var hiddenTabIds = [];
    var index = 0;
    var frame;
    while (index < ids.length) {
      frame = _baseSelectors.readFrame(_KDB, ids[index]);
      if (isWaveFrame(frame) && qualifies(_readSettings(frame.widgetId || ids[index]))) {
        if (activeTabId && frame.tabId && frame.tabId !== activeTabId) {
          pushHidden(hiddenTabIds, frame.tabId);
        } else {
          widgetIds.push(frame.widgetId || ids[index]);
        }
      }
      index += 1;
    }
    return { widgetIds: widgetIds, hiddenTabIds: hiddenTabIds };
  }

  function qualifyFrames(_KDB, _readSettings, _frames) {
    var widgetIds = [];
    var index = 0;
    var frame;
    while (index < _frames.length) {
      frame = _frames[index];
      if (isWaveFrame(frame) && qualifies(_readSettings(frame.widgetId))) {
        widgetIds.push(frame.widgetId);
      }
      index += 1;
    }
    return widgetIds;
  }

  function isWaveFrame(_frame) {
    return !!(_frame && _frame.placement === "onCanvas" && _frame.kind === "vis" && _frame.lifecycle !== "disposed" && _frame.widgetId);
  }

  function qualifies(_settings) {
    var settings = _settings || {};
    return _normalizeDefaultValue(settings.dimension) != null && _waiters.isDefaultTopNChoice(settings.topNChoice) !== true;
  }

  function pushHidden(_hiddenTabIds, _tabId) {
    if (_hiddenTabIds.indexOf(_tabId) === -1) {
      _hiddenTabIds.push(_tabId);
    }
  }

  return __controller;
});
