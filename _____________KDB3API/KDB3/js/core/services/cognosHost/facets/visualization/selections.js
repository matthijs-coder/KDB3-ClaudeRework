define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../runtime.js"
], function (_outcome, _errorCodes, _hostAccess, _runtime) {
  "use strict";

  var CODES = _errorCodes.visualization;
  var CATEGORY_KEYS = ["columnId", "label", "dataItemId", "name", "value"];
  var KIND_BY_EVENT = {
    "change:selections:select": "select",
    "change:selections:deselect": "deselect",
    "change:selections:clearAll": "clearAll"
  };

  function noopUnsubscribe() {}

  // Only columnId, label, dataItemId, name, value cross the facet boundary.
  function flattenCategory(_category) {
    var dto = {};
    var index;
    for (index = 0; index < CATEGORY_KEYS.length; index += 1) {
      if (_category[CATEGORY_KEYS[index]] !== undefined) {
        dto[CATEGORY_KEYS[index]] = _category[CATEGORY_KEYS[index]];
      }
    }
    return dto;
  }

  function flattenCategoryList(_categories) {
    var flattened = [];
    var index;
    if (!Array.isArray(_categories)) {
      return flattened;
    }
    for (index = 0; index < _categories.length; index += 1) {
      if (_categories[index] && typeof _categories[index] === "object") {
        flattened.push(flattenCategory(_categories[index]));
      }
    }
    return flattened;
  }

  // Host shapes: getSelections()[0].categories and event.info.value[0].categories.
  function flattenSelectionCategories(_hostPayload) {
    var first;
    if (_hostPayload == null) {
      return [];
    }
    first = Array.isArray(_hostPayload) ? _hostPayload[0] : _hostPayload;
    if (!first || typeof first !== "object") {
      return [];
    }
    return flattenCategoryList(first.categories);
  }

  // Last subscribe DTO per widgetId: getSelections falls back to it when the host has no live answer.
  function rememberLastSelectionDto(_ctx, _widgetId, _categories) {
    var map;
    var copied;
    if (!_hostAccess.isValidWidgetId(_widgetId)) {
      return;
    }
    map = _runtime.ensureRuntime(_ctx._KDB).adapters.lastSelectionDtoByWidgetId;
    copied = flattenCategoryList(_categories);
    if (copied.length === 0) {
      delete map[_widgetId];
      return;
    }
    map[_widgetId] = { widgetId: _widgetId, categories: copied };
  }

  function readLastSelectionDto(_ctx, _widgetId) {
    var stored;
    var copied;
    if (!_hostAccess.isValidWidgetId(_widgetId)) {
      return null;
    }
    stored = _runtime.ensureRuntime(_ctx._KDB).adapters.lastSelectionDtoByWidgetId[_widgetId];
    if (!stored || !Array.isArray(stored.categories)) {
      return null;
    }
    copied = flattenCategoryList(stored.categories);
    if (copied.length === 0) {
      return null;
    }
    return {
      widgetId: _hostAccess.isValidWidgetId(stored.widgetId) ? stored.widgetId : _widgetId,
      categories: copied
    };
  }

  // Live PO: widgets.getContent is getCanvas().getContent and has no getSelections.
  // Legacy: getFeature("Canvas").getContent(id).getSelections(), reached through the canvas theme.
  function resolveSelectionContent(_KDB, _widgetId) {
    var canvasApi = _hostAccess.resolveHostApi(_KDB, "canvas");
    var widgetsApi;
    var canvasFeature;
    var canvasContent;
    var widgetsContent;
    if (canvasApi && typeof canvasApi.getCanvasFeature === "function") {
      canvasFeature = canvasApi.getCanvasFeature();
      if (canvasFeature && typeof canvasFeature.getContent === "function") {
        canvasContent = canvasFeature.getContent(_widgetId);
      }
    }
    if (canvasContent && typeof canvasContent.getSelections === "function") {
      return canvasContent;
    }
    widgetsApi = _hostAccess.resolveHostApi(_KDB, "widgets");
    if (widgetsApi && typeof widgetsApi.getContent === "function") {
      widgetsContent = widgetsApi.getContent(_widgetId);
    }
    if (widgetsContent && typeof widgetsContent.getSelections === "function") {
      return widgetsContent;
    }
    return widgetsContent || canvasContent || null;
  }

  function failedRead(_error) {
    return _outcome.buildFailed(CODES.READ_FAILED, [
      _outcome.buildDiagnostic(CODES.READ_FAILED, _error && _error.message ? _error.message : String(_error))
    ]);
  }

  function getSelections(_ctx, _widgetId) {
    var content;
    var hostResult;
    var categories;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (!_hostAccess.isValidWidgetId(_widgetId)) {
      return _outcome.buildFailed(CODES.INVALID_ID, []);
    }
    try {
      content = resolveSelectionContent(_ctx._KDB, _widgetId);
      if (!content || typeof content.getSelections !== "function") {
        return _outcome.buildOk(readLastSelectionDto(_ctx, _widgetId));
      }
      hostResult = content.getSelections();
      if (_hostAccess.isThenable(hostResult) || hostResult == null) {
        return _outcome.buildOk(readLastSelectionDto(_ctx, _widgetId));
      }
      try {
        categories = flattenSelectionCategories(hostResult);
      } catch (flattenError) {
        console.error("[cognosHost.visualization.getSelections] flatten failed", { widgetId: _widgetId }, flattenError);
        return failedRead(flattenError);
      }
      if (!categories || categories.length === 0) {
        return _outcome.buildOk(readLastSelectionDto(_ctx, _widgetId));
      }
      return _outcome.buildOk({ widgetId: _widgetId, categories: categories });
    } catch (error) {
      console.error("[cognosHost.visualization.getSelections] failed", { widgetId: _widgetId }, error);
      return failedRead(error);
    }
  }

  function emitSelectionDto(_box, _ctx, _widgetId, _kind, _categories) {
    if (_box.released || !_box.callback || _hostAccess.isFacetStale(_ctx)) {
      return;
    }
    try {
      _box.callback({
        kind: _kind,
        widgetId: _widgetId,
        categories: Array.isArray(_categories) ? _categories : []
      });
    } catch (callbackError) {
      console.error("[cognosHost.visualization.subscribeSelections] callback failed", callbackError);
    }
  }

  function onHostSelectionEvent(_box, _ctx, _widgetId, _event) {
    var kind;
    var categories;
    if (!_event || !_event.name) {
      return;
    }
    kind = KIND_BY_EVENT[_event.name];
    if (!kind) {
      return;
    }
    try {
      categories = flattenSelectionCategories(_event.info ? _event.info.value : null);
    } catch (flattenError) {
      console.error("[cognosHost.visualization.subscribeSelections] flatten failed", flattenError);
      categories = [];
    }
    if (!_box.released && !_hostAccess.isFacetStale(_ctx)) {
      rememberLastSelectionDto(_ctx, _widgetId, kind === "select" && categories && categories.length ? categories : null);
    }
    emitSelectionDto(_box, _ctx, _widgetId, kind, categories);
  }

  // Drops a released unsubscribe from the per-widget slot and from runtime.subscriptions (otherwise
  // every re-subscribe would keep a closure plus its host handle until destroy). The disposed guard is
  // redundant for correctness since clearRuntime iterates a copy; it only saves pruning a dying bucket.
  function forgetUnsubscribe(_ctx, _widgetId, _unsubscribe) {
    var runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.cognosHostService;
    var map = runtime && runtime.adapters && runtime.adapters.selectionUnsubscribeByWidgetId;
    if (map && map[_widgetId] === _unsubscribe) {
      delete map[_widgetId];
    }
    if (runtime && !_ctx.isDisposed()) {
      _runtime.pruneSubscription(_ctx._KDB, _unsubscribe);
    }
  }

  function releaseSelectionListener(_content, _listener, _handle) {
    if (_content && typeof _listener === "function") {
      _hostAccess.detachHostSubscription(_content, "all", _listener);
    }
    if (_handle && _handle !== _content) {
      _hostAccess.detachHostSubscription(_handle);
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
      forgetUnsubscribe(_ctx, _widgetId, unsubscribeSelections);
    };
  }

  // Per-widgetId replace: the previous host listener is released before a new one is armed.
  // A null next unsubscribe only clears the slot.
  function replaceSelectionSubscription(_ctx, _widgetId, _nextUnsubscribe) {
    var runtime = _runtime.ensureRuntime(_ctx._KDB);
    var map = runtime.adapters.selectionUnsubscribeByWidgetId;
    var previous = map[_widgetId];
    if (typeof previous === "function") {
      try {
        previous();
      } catch (error) {
        console.error("[cognosHost.visualization.subscribeSelections] replace failed", error);
      }
    }
    if (typeof _nextUnsubscribe !== "function") {
      delete map[_widgetId];
      return;
    }
    map[_widgetId] = _nextUnsubscribe;
    _runtime.addSubscription(_ctx._KDB, _nextUnsubscribe);
  }

  function subscribeSelections(_ctx, _widgetId, _callback) {
    var widgetsApi;
    var content;
    var handle;
    var box;
    var listener;
    var unsubscribe;
    if (typeof _callback !== "function" || !_hostAccess.isValidWidgetId(_widgetId) || _hostAccess.isFacetStale(_ctx)) {
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
      replaceSelectionSubscription(_ctx, _widgetId, null);
      box = { callback: _callback, released: false };
      listener = onHostSelectionEvent.bind(null, box, _ctx, _widgetId);
      handle = content.on("all", listener);
      unsubscribe = createOwnerUnsubscribe(box, content, listener, handle, _ctx, _widgetId);
      replaceSelectionSubscription(_ctx, _widgetId, unsubscribe);
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

  function createSelectionOps(_ctx) {
    return {
      getSelections: getSelections.bind(null, _ctx),
      subscribeSelections: subscribeSelections.bind(null, _ctx)
    };
  }

  return {
    createSelectionOps: createSelectionOps,
    flattenSelectionCategories: flattenSelectionCategories
  };
});
