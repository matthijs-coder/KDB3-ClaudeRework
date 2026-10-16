define(["./resolveTabsHostApi.js"], function (_resolveTabsHostApi) {
  "use strict";

  function readSafeId(_hostObject) {
    if (!_hostObject || typeof _hostObject.getId !== "function") {
      return null;
    }
    try {
      var value = _hostObject.getId();
      return value == null || value === "" ? null : String(value);
    } catch (_err) {
      return null;
    }
  }

  function readWidgetId(_canvasItem) {
    return readSafeId(_canvasItem);
  }

  function readContentType(_canvasItem) {
    if (!_canvasItem || typeof _canvasItem.getType !== "function") {
      return null;
    }
    try {
      var value = _canvasItem.getType();
      return value == null || value === "" ? null : String(value);
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
    return readSafeId(readWidgetContainer(_canvasItem));
  }

  function readChainTabId(_canvasItem) {
    var widgetContainer = readWidgetContainer(_canvasItem);
    if (!widgetContainer || typeof widgetContainer.getContainer !== "function") {
      return null;
    }
    try {
      return readSafeId(widgetContainer.getContainer());
    } catch (_err) {
      return null;
    }
  }

  function readLayoutTabId(_layoutItem) {
    return _layoutItem && _layoutItem.id ? String(_layoutItem.id) : null;
  }

  function layoutChildMatches(_layoutItem, _containerId) {
    var items = _layoutItem && Array.isArray(_layoutItem.items) ? _layoutItem.items : [];
    var index = 0;
    while (index < items.length) {
      if (items[index] && items[index].id === _containerId) {
        return true;
      }
      index += 1;
    }
    return false;
  }

  function layoutItemMatches(_layoutItem, _containerId) {
    var tabId = readLayoutTabId(_layoutItem);
    return !!tabId && (tabId === _containerId || layoutChildMatches(_layoutItem, _containerId));
  }

  var layoutItemsCache = { kdb: null, items: null };

  function readLayoutItems(_KDB) {
    var tabsApi;
    var items;
    if (layoutItemsCache.kdb === _KDB && layoutItemsCache.items) {
      return layoutItemsCache.items;
    }
    tabsApi = _resolveTabsHostApi(_KDB);
    if (!tabsApi || typeof tabsApi.getTabsContainers !== "function") {
      return [];
    }
    try {
      items = tabsApi.getTabsContainers() || [];
    } catch (_err) {
      items = [];
    }
    layoutItemsCache.kdb = _KDB;
    layoutItemsCache.items = items;
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

  function readCanvasTabId(_KDB, _canvasItem) {
    var containerId = readContainerId(_canvasItem);
    return canonicalizeTabId(_KDB, containerId) || readChainTabId(_canvasItem);
  }

  return {
    readWidgetId: readWidgetId,
    readContentType: readContentType,
    readContainerId: readContainerId,
    readCanvasTabId: readCanvasTabId
  };
});
