define([], function () {
  "use strict";

  function detachHostSubscription(_handle, _eventName, _listener) {
    var hasTargetedOff = !!_eventName && typeof _listener === "function";
    if (!_handle) {
      return;
    }
    if (typeof _handle.then === "function") {
      _handle.then(function onResolvedHandle(resolved) {
        detachHostSubscription(resolved, _eventName, _listener);
      }, function ignoreHostPromise() {});
      return;
    }
    if (hasTargetedOff && typeof _handle.off === "function") {
      _handle.off(_eventName, _listener);
      return;
    }
    if (hasTargetedOff) {
      if (typeof _handle.unsubscribe === "function") {
        _handle.unsubscribe();
      } else if (typeof _handle === "function") {
        _handle();
      }
      return;
    }
    if (typeof _handle.remove === "function") {
      _handle.remove();
      return;
    }
    if (typeof _handle.off === "function") {
      _handle.off();
      return;
    }
    if (typeof _handle.unsubscribe === "function") {
      _handle.unsubscribe();
      return;
    }
    if (typeof _handle.dispose === "function") {
      _handle.dispose();
      return;
    }
    if (typeof _handle === "function") {
      _handle();
    }
  }

  return detachHostSubscription;
});
