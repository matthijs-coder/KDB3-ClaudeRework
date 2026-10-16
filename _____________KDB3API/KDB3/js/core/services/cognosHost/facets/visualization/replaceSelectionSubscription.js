define(["../../runtime/ensureCognosHostRuntime.js"], function (_ensureCognosHostRuntime) {
  "use strict";

  function replaceSelectionSubscription(_ctx, _widgetId, _nextUnsubscribe) {
    var runtime;
    var map;
    var previous;
    if (!_ctx || !_ctx._KDB) {
      return false;
    }
    runtime = _ensureCognosHostRuntime(_ctx._KDB);
    if (!runtime || !runtime.adapters) {
      return false;
    }
    map = runtime.adapters.selectionUnsubscribeByWidgetId;
    if (!map) {
      return false;
    }
    previous = map[_widgetId];
    if (typeof previous === "function") {
      try {
        previous();
      } catch (error) {
        console.error("[cognosHost.visualization.subscribeSelections] replace failed", error);
      }
    }
    if (typeof _nextUnsubscribe !== "function") {
      delete map[_widgetId];
      return true;
    }
    if (!Array.isArray(runtime.subscriptions)) {
      delete map[_widgetId];
      return false;
    }
    map[_widgetId] = _nextUnsubscribe;
    runtime.subscriptions.push(_nextUnsubscribe);
    return true;
  }

  return replaceSelectionSubscription;
});
