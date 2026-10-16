define([
  "./handleDisposeWidgetRuntime.js",
  "./handleEnsureObservers.js"
], function (_handleDisposeWidgetRuntime, _handleEnsureObservers) {
  "use strict";

  // Dunne re-export zodat de actionRouter met één import beide
  // lifecycle-handlers (dispose bij park/tab-delete/remove, rebuild bij
  // unpark) kan routeren.
  return {
    handleDisposeWidgetRuntime: _handleDisposeWidgetRuntime,
    handleEnsureObservers: _handleEnsureObservers
  };
});
