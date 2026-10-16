define(["./outcome.js"], function (_outcome) {
  "use strict";

  // Shared host-access helpers of the cognosHost facets (ring 1).

  // The single way ring 1 reaches _KDB.cognosAPI.<theme>. Resolved per call and
  // never captured: teardown nulls _KDB.cognosAPI, a captured reference would outlive the host.
  // The messages facet passes "glassMessages" (there is no _KDB.cognosAPI.messages).
  function resolveHostApi(_KDB, _theme) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI[_theme] || null;
  }

  // Theme present and host method callable -> { api }; otherwise { failure } with the facet's
  // HOST_UNAVAILABLE / HOST_CAPABILITY_MISSING Outcome. Callers invoke api[method](...) themselves
  // so the host `this` binding is kept.
  function resolveHostMethod(_KDB, _theme, _method, _codes) {
    var api = resolveHostApi(_KDB, _theme);
    if (!api) {
      return { failure: _outcome.buildFailed(_codes.HOST_UNAVAILABLE, []) };
    }
    if (typeof api[_method] !== "function") {
      return { failure: _outcome.buildFailed(_codes.HOST_CAPABILITY_MISSING, []) };
    }
    return { api: api };
  }

  function isAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  function isThenable(_value) {
    return !!(
      _value &&
      (typeof _value === "object" || typeof _value === "function") &&
      typeof _value.then === "function"
    );
  }

  // True when the service is disposed or this facet's generation is no longer the runtime's.
  function isFacetStale(_ctx) {
    var runtime;
    if (!_ctx || typeof _ctx.isDisposed !== "function" || _ctx.isDisposed()) {
      return true;
    }
    runtime = _ctx._KDB && _ctx._KDB.runtime && _ctx._KDB.runtime.cognosHostService;
    if (!runtime) {
      return true;
    }
    return runtime.generation !== _ctx.generation;
  }

  // Releases whatever a host subscribe call returned (promise, handle with off/unsubscribe/remove/dispose,
  // or a plain function). With an event name and listener it prefers the targeted off(eventName, listener).
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

  return {
    resolveHostApi: resolveHostApi,
    resolveHostMethod: resolveHostMethod,
    isAborted: isAborted,
    isValidWidgetId: isValidWidgetId,
    isThenable: isThenable,
    isFacetStale: isFacetStale,
    detachHostSubscription: detachHostSubscription
  };
});
