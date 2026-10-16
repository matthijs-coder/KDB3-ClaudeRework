define([], function () {
  function commitWidgetBaseHistory(_KDB, _step) {
    if (!_KDB.services || !_KDB.services.history || typeof _KDB.services.history.pushCommittedStep !== "function") {
      return false;
    }
    try {
      return _KDB.services.history.pushCommittedStep(_step) === true;
    } catch (err) {
      console.error("[widgetBase.commitWidgetBaseHistory] history commit failed", _step && _step.key, err);
      return false;
    }
  }
  return commitWidgetBaseHistory;
});
