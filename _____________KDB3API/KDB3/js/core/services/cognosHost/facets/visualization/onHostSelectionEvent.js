define([
  "./flatten/flattenSelectionCategories.js",
  "./rememberLastSelectionDto.js"
], function (
  _flattenSelectionCategories,
  _rememberLastSelectionDto
) {
  "use strict";

  var KIND_BY_EVENT = {
    "change:selections:select": "select",
    "change:selections:deselect": "deselect",
    "change:selections:clearAll": "clearAll"
  };

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

  function emitSelectionDto(_box, _ctx, _widgetId, _kind, _categories) {
    if (_box.released || !_box.callback || isSubscribeStale(_ctx)) {
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

  function rememberOrClear(_ctx, _widgetId, _kind, _categories) {
    if (_kind === "select" && _categories && _categories.length) {
      _rememberLastSelectionDto(_ctx, _widgetId, _categories);
      return;
    }
    _rememberLastSelectionDto(_ctx, _widgetId, null);
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
      categories = _flattenSelectionCategories(_event.info ? _event.info.value : null);
    } catch (flattenError) {
      console.error("[cognosHost.visualization.subscribeSelections] flatten failed", flattenError);
      categories = [];
    }
    if (!_box.released && !isSubscribeStale(_ctx)) {
      rememberOrClear(_ctx, _widgetId, kind, categories);
    }
    emitSelectionDto(_box, _ctx, _widgetId, kind, categories);
  }

  return onHostSelectionEvent;
});
