define([
  "./actions/handleContentCreate.js",
  "./actions/handleWaitUntilContentReady.js",
  "./actions/handleEnsureObservers.js",
  "./actions/handleDisposeWidgetRuntime.js",
  "./runtime/cleanupRuntime.js"
], function (_handleContentCreate, _handleWaitUntilContentReady, _handleEnsureObservers, _handleDisposeWidgetRuntime, _cleanupRuntime) {
  "use strict";

  return {
    handleContentCreate: _handleContentCreate,
    handleWaitUntilContentReady: _handleWaitUntilContentReady,
    handleEnsureObservers: _handleEnsureObservers,
    handleDisposeWidgetRuntime: _handleDisposeWidgetRuntime,
    disposeModuleRuntime: _cleanupRuntime
  };
});
