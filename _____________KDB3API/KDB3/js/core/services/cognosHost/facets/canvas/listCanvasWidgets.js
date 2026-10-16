define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../runtime.js"
], function (_outcome, _errorCodes, _hostAccess, _runtime) {
  "use strict";

  var CODES = _errorCodes.canvas;

  function toHostString(_value) {
    return _value == null || _value === "" ? null : String(_value);
  }

  // String read of a host getter (getId, getType); null for missing, empty or throwing getters.
  function readHostString(_hostObject, _method) {
    if (!_hostObject || typeof _hostObject[_method] !== "function") {
      return null;
    }
    try {
      return toHostString(_hostObject[_method]());
    } catch (_err) {
      return null;
    }
  }

  function readWidgetContainer(_canvasItem) {
    if (!_canvasItem || typeof _canvasItem.getContainer !== "function") {
      return null;
    }
    try {
      return _canvasItem.getContainer() || null;
    } catch (_err) {
      return null;
    }
  }

  function readContainerId(_canvasItem) {
    return readHostString(readWidgetContainer(_canvasItem), "getId");
  }

  function readChainTabId(_canvasItem) {
    return readHostString(readWidgetContainer(readWidgetContainer(_canvasItem)), "getId");
  }

  function readLayoutTabId(_layoutItem) {
    return _layoutItem && _layoutItem.id ? String(_layoutItem.id) : null;
  }

  function layoutItemMatches(_layoutItem, _containerId) {
    var tabId = readLayoutTabId(_layoutItem);
    var items = _layoutItem && Array.isArray(_layoutItem.items) ? _layoutItem.items : [];
    return !!tabId && (tabId === _containerId || items.some(function (child) {
      return !!child && child.id === _containerId;
    }));
  }

  // Layout of the tab containers, cached in runtime.cognosHostService.adapters.layoutItems (per _KDB instance,
  // dropped by clearRuntime): canonicalising a canvas container id onto a tab id would otherwise re-read
  // the layout for every widget.
  function readLayoutItems(_KDB) {
    var adapters = _runtime.ensureRuntime(_KDB).adapters;
    var tabsApi;
    var items;
    if (adapters.layoutItems) {
      return adapters.layoutItems;
    }
    tabsApi = _hostAccess.resolveHostApi(_KDB, "tabs");
    if (!tabsApi || typeof tabsApi.getTabsContainers !== "function") {
      return [];
    }
    try {
      items = tabsApi.getTabsContainers() || [];
    } catch (_err) {
      items = [];
    }
    adapters.layoutItems = items;
    return items;
  }

  function canonicalizeTabId(_KDB, _containerId) {
    var layoutItems;
    var index;
    if (!_containerId) {
      return null;
    }
    layoutItems = readLayoutItems(_KDB);
    for (index = 0; index < layoutItems.length; index += 1) {
      if (layoutItemMatches(layoutItems[index], _containerId)) {
        return readLayoutTabId(layoutItems[index]);
      }
    }
    return null;
  }

  function readHostMetaString(_KDB, _theme, _method, _widgetId) {
    var api = _hostAccess.resolveHostApi(_KDB, _theme);
    if (!api || typeof api[_method] !== "function") {
      return null;
    }
    try {
      return toHostString(api[_method](_widgetId));
    } catch (_err) {
      return null;
    }
  }

  function normalizeCanvasContentItems(_content) {
    if (Array.isArray(_content)) {
      return _content;
    }
    if (_content && Array.isArray(_content.items)) {
      return _content.items;
    }
    if (_content && Array.isArray(_content.children)) {
      return _content.children;
    }
    return [];
  }

  // Host fields only. Owner policy (skipReason, route, helper-tabs, DOM text) stays in widgetBase.
  function flattenCanvasWidgetDescriptor(_KDB, _canvasItem) {
    var widgetId = readHostString(_canvasItem, "getId");
    var contentType;
    var widgetType;
    var visType;
    var visTitle;
    if (!widgetId) {
      return null;
    }
    contentType = readHostString(_canvasItem, "getType");
    widgetType = readHostMetaString(_KDB, "widgets", "getType", widgetId);
    visType = readHostMetaString(_KDB, "visualization", "getVisType", widgetId);
    visTitle = readHostMetaString(_KDB, "visualization", "getVisTitle", widgetId);
    return {
      widgetId: widgetId,
      tabId: canonicalizeTabId(_KDB, readContainerId(_canvasItem)) || readChainTabId(_canvasItem),
      containerId: readContainerId(_canvasItem),
      widgetType: widgetType,
      contentType: contentType,
      isLiveWidget: contentType === "widget.live",
      visType: visType,
      visTitle: visTitle
    };
  }

  function listNow(_ctx) {
    var resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "canvas", "findCanvasContent", CODES);
    var items;
    var descriptors = [];
    var index;
    var descriptor;
    if (resolved.failure) {
      return resolved.failure;
    }
    items = normalizeCanvasContentItems(resolved.api.findCanvasContent());
    for (index = 0; index < items.length; index += 1) {
      descriptor = flattenCanvasWidgetDescriptor(_ctx._KDB, items[index]);
      if (descriptor) {
        descriptors.push(descriptor);
      }
    }
    return _outcome.buildOk(descriptors);
  }

  function failedInventory(_label, _error) {
    console.error("[cognosHost.canvas.listCanvasWidgets] " + _label, _error);
    return _outcome.buildFailed(CODES.INVENTORY_FAILED, [_outcome.buildDiagnostic(CODES.INVENTORY_FAILED, _error && _error.message)]);
  }

  // waitUntilReady is tableData's previous getCanvasWhenReady + list: the host promise is discarded.
  // The published whenCanvasReady is a separate wait op.
  async function listAfterHostReady(_ctx, _input) {
    var resolved;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(_input)) {
      return _outcome.buildAborted("aborted");
    }
    resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "canvas", "getCanvasWhenReady", CODES);
    if (resolved.failure) {
      return resolved.failure;
    }
    try {
      await Promise.resolve(resolved.api.getCanvasWhenReady());
      if (_ctx.isDisposed()) {
        return _outcome.buildDisposed();
      }
      if (_hostAccess.isAborted(_input)) {
        return _outcome.buildAborted("aborted");
      }
      return listNow(_ctx);
    } catch (error) {
      return failedInventory("waitUntilReady failed", error);
    }
  }

  // Default is synchronous best-effort, matching widgetBase/launchpad.
  function listCanvasWidgets(_ctx, _input) {
    var input = _input || {};
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    try {
      if (input.waitUntilReady === true) {
        return listAfterHostReady(_ctx, input);
      }
      return listNow(_ctx);
    } catch (error) {
      return failedInventory("failed", error);
    }
  }

  return listCanvasWidgets;
});
