define([], function () {
  function noopUnsubscribe() {}

  function subscribeDropValidated(_KDB, _dispatch) {
    const events = _KDB ? _KDB["events"] : null;
    if (!events || typeof events.subscribe !== "function") {
      return noopUnsubscribe;
    }
    return events.subscribe("canvas:dropValidated", function (_payload) {
      startDropCreate(_KDB, _dispatch, _payload);
    });
  }

  function startDropCreate(_KDB, _dispatch, _payload) {
    try {
      Promise.resolve(_dispatch({
        type: "widgetBase/dropCreate",
        payload: { dropRequest: _payload || {}, isHistoryReplay: false }
      })).then(function (result) {
        if (result && result.ok !== true && result.isEligibleListEmpty === true) {
          notifyPadExhausted(_KDB);
        }
      }).catch(function (err) {
        console.warn("[widgetBase.subscribeDropValidated] dropCreate failed", err);
      });
    } catch (err) {
      console.error("[widgetBase.subscribeDropValidated] subscriber boundary failed", err);
      _dispatch({
        type: "widgetBase/reportError",
        payload: { errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: String(err && err.message ? err.message : err), operation: "dropValidated" }
      });
    }
  }

  function notifyPadExhausted(_KDB) {
    try {
      const labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de
        ? _KDB.config.labels.de.widgetBase
        : null;
      const labeled = labels && labels.maxWidgetsPerTab;
      const message = labeled ? labeled : "Die maximale Anzahl von Widgets pro Tab ist bereits in Verwendung";
      const svc = _KDB && _KDB.services && _KDB.services.message;
      if (!svc || typeof svc.notify !== "function") {
        console.warn("[widgetBase.subscribeDropValidated] message service unavailable");
        return;
      }
      svc.notify({ message: message, severity: "warning" });
    } catch (err) {
      console.warn("[widgetBase.subscribeDropValidated] notifyPadExhausted failed", err);
    }
  }

  return subscribeDropValidated;
});
