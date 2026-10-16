define([
  "../../hostAccess.js",
  "./onHostSelectionEvent.js",
  "./detachHostSubscription.js",
  "./replaceSelectionSubscription.js"
], function (
  _hostAccess,
  _onHostSelectionEvent,
  _detachHostSubscription,
  _replaceSelectionSubscription
) {
  "use strict";

  function noopUnsubscribe() {}

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  function isSubscribeStale(_ctx) {
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

  function forgetWidgetUnsubscribe(_ctx, _widgetId, _unsubscribe) {
    var runtime = _ctx && _ctx._KDB && _ctx._KDB.runtime && _ctx._KDB.runtime.cognosHostService;
    var map = runtime && runtime.adapters && runtime.adapters.selectionUnsubscribeByWidgetId;
    if (map && map[_widgetId] === _unsubscribe) {
      delete map[_widgetId];
    }
  }

  function releaseSelectionListener(_content, _listener, _handle) {
    if (_content && typeof _listener === "function") {
      _detachHostSubscription(_content, "all", _listener);
    }
    if (_handle && _handle !== _content) {
      _detachHostSubscription(_handle);
    }
  }

  function createOwnerUnsubscribe(_box, _content, _listener, _handle, _ctx, _widgetId) {
    return function unsubscribeSelections() {
      if (_box.released) {
        return;
      }
      _box.released = true;
      _box.callback = null;
      try {
        releaseSelectionListener(_content, _listener, _handle);
      } catch (detachError) {
        console.error("[cognosHost.visualization.subscribeSelections] unsubscribe failed", detachError);
      }
      forgetWidgetUnsubscribe(_ctx, _widgetId, unsubscribeSelections);
    };
  }

  function subscribeSelections(_ctx, _widgetId, _callback) {
    var widgetsApi;
    var content;
    var handle;
    var box;
    var listener;
    var unsubscribe;
    if (typeof _callback !== "function" || !isValidWidgetId(_widgetId) || isSubscribeStale(_ctx)) {
      return noopUnsubscribe;
    }
    try {
      widgetsApi = _hostAccess.resolveHostApi(_ctx._KDB, "widgets");
      if (!widgetsApi || typeof widgetsApi.getContent !== "function") {
        return noopUnsubscribe;
      }
      content = widgetsApi.getContent(_widgetId);
      if (!content || typeof content.on !== "function") {
        return noopUnsubscribe;
      }
      if (!_replaceSelectionSubscription(_ctx, _widgetId, null)) {
        return noopUnsubscribe;
      }
      box = { callback: _callback, released: false };
      listener = _onHostSelectionEvent.bind(null, box, _ctx, _widgetId);
      handle = content.on("all", listener);
      unsubscribe = createOwnerUnsubscribe(box, content, listener, handle, _ctx, _widgetId);
      if (!_replaceSelectionSubscription(_ctx, _widgetId, unsubscribe)) {
        unsubscribe();
        return noopUnsubscribe;
      }
      return unsubscribe;
    } catch (error) {
      console.error("[cognosHost.visualization.subscribeSelections] failed", error);
      try {
        releaseSelectionListener(content, listener, handle);
      } catch (_detachError) {
        // Host detach after a failed subscribe must not throw across the facet.
      }
      return noopUnsubscribe;
    }
  }

  return subscribeSelections;
});
