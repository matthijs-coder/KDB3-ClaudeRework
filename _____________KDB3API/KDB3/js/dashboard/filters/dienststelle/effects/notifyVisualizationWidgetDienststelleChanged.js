define(["./buildVisualizationWidgetDienststellePayload.js"], function (_payloadBuilder) {
  "use strict";

  var NOTIFY_CONTEXT_SOURCES = {
    user: true,
    startup: true,
    sicht: true,
    historyReplay: true
  };

  function dispatchOrLog(_KDB, _payload) {
    var widgetVisApi = _KDB && _KDB.api ? _KDB.api.widgetVis : null;
    if (widgetVisApi && typeof widgetVisApi.dispatch === "function") {
      widgetVisApi.dispatch({
        type: "widgetVis/dienststelleChanged",
        payload: _payload
      });
      return;
    }
    console.info("[dienststelle.widgetVis.dispatch]", _payload);
  }

  function maybeNotifyVisualizationWidgetDienststelleChanged(
    _KDB,
    _context,
    _definition,
    _reconcileResult
  ) {
    var context = _context || {};
    var contextSource = context.source != null ? String(context.source) : "";
    var effective;
    if (!_reconcileResult || !_definition || !NOTIFY_CONTEXT_SOURCES[contextSource]) {
      return;
    }
    effective = _payloadBuilder.readEffectiveSelection(_reconcileResult);
    if (!effective.selection || !effective.selection.useValue) {
      return;
    }
    try {
      dispatchOrLog(
        _KDB,
        _payloadBuilder.buildVisualizationWidgetDienststellePayload(
          _KDB,
          context,
          _definition,
          _reconcileResult
        )
      );
    } catch (_error) {
      console.warn("[dienststelle.widgetVis.dispatch] boundary failed", _error);
    }
  }

  return maybeNotifyVisualizationWidgetDienststelleChanged;
});
