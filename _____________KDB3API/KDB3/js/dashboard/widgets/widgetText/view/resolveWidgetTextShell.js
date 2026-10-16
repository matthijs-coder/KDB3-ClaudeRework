define([], function () {
  function __controller(_KDB, _widgetId) {
    try {
      if (!_widgetId) {
        return null;
      }
      return document.getElementById(_widgetId);
    } catch (err) {
      console.error("[widgetText.resolveWidgetTextShell] failed", { widgetId: _widgetId }, err);
      return null;
    }
  }
  return __controller;
});
