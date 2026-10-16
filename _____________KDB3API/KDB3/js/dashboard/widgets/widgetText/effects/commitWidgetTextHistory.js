define([], function () {
  function __controller(_KDB, _widgetId, _previousText, _nextText, _options) {
    try {
      var options = _options || {};
      if (options.isHistoryReplay) {
        return { ok: true, skipped: true };
      }
      var history = _KDB.services && _KDB.services.history ? _KDB.services.history : null;
      if (!history || typeof history.pushCommittedStep !== "function") {
        return { ok: false, errorCode: "WIDGET_TEXT_HISTORY_COMMIT_FAILED", errorMessage: "historyService unavailable" };
      }
      var step = {
        key: "widget_textEdit",
        timestamp: Date.now(),
        old: { widgetId: _widgetId, text: _previousText != null ? String(_previousText) : "" },
        new: { widgetId: _widgetId, text: _nextText != null ? String(_nextText) : "" }
      };
      var committed = history.pushCommittedStep(step);
      return { ok: committed === true };
    } catch (err) {
      console.error("[widgetText.commitWidgetTextHistory] failed", { widgetId: _widgetId }, err);
      return { ok: false, errorCode: "WIDGET_TEXT_HISTORY_COMMIT_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }
  return __controller;
});
