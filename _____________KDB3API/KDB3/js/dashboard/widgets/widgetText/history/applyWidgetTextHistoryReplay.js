define([], function () {
  function __controller(_KDB, _replay) {
    try {
      var replay = _replay || {};
      var targetValue = replay.targetValue || {};
      var widgetId = String(targetValue.widgetId || "");
      if (!widgetId) {
        return Promise.resolve(false);
      }
      var api = _KDB && _KDB.api ? _KDB.api.widgetText : null;
      if (!api || typeof api.dispatch !== "function") {
        return Promise.resolve(false);
      }
      return Promise.resolve(api.dispatch({
        type: "widgetText/commitTextEdit",
        widgetId: widgetId,
        payload: {
          nextText: targetValue.text != null ? String(targetValue.text) : "",
          isHistoryReplay: true,
          source: "historyReplay"
        }
      })).then(function (result) {
        return !!(result && result.ok === true);
      });
    } catch (err) {
      console.error("[widgetText.applyWidgetTextHistoryReplay] failed", err);
      return Promise.resolve(false);
    }
  }

  return __controller;
});
