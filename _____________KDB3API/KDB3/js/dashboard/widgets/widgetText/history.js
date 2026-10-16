define([
  "./config/actionTypes.js",
  "../../../core/utils/kit/history.js"
], function (_actionTypes, _history) {
  "use strict";

  var STEP_KEY = "widget_textEdit";

  function buildSnapshot(_widgetId, _text) {
    return { widgetId: _widgetId, text: _text != null ? String(_text) : "" };
  }

  function pushTextEditHistory(_KDB, _widgetId, _previousText, _nextText) {
    return _history.pushHistoryStep(_KDB, {
      key: STEP_KEY,
      timestamp: Date.now(),
      old: buildSnapshot(_widgetId, _previousText),
      new: buildSnapshot(_widgetId, _nextText)
    });
  }

  async function applyTextEditReplay(_KDB, _targetValue) {
    var targetValue = _targetValue || {};
    var widgetId = String(targetValue.widgetId || "");
    var api = _KDB && _KDB.api ? _KDB.api.widgetText : null;
    if (!widgetId || !api || typeof api.dispatch !== "function") {
      return false;
    }
    var result = await api.dispatch({
      type: _actionTypes.COMMIT_TEXT_EDIT,
      widgetId: widgetId,
      payload: {
        nextText: targetValue.text != null ? String(targetValue.text) : "",
        isHistoryReplay: true,
        source: "historyReplay"
      }
    });
    return !!(result && result.ok === true);
  }

  function createWidgetTextReplayHandler() {
    var applyByKey = {};
    applyByKey[STEP_KEY] = applyTextEditReplay;
    return _history.createReplayHandler(applyByKey);
  }

  return {
    pushTextEditHistory: pushTextEditHistory,
    createWidgetTextReplayHandler: createWidgetTextReplayHandler
  };
});
