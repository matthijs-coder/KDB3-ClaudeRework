define([], function () {
  function readCanvasDiscoverySources() {
    return {
      readHelperTabIds: readHelperTabIds,
      resolveWidgetId: resolveWidgetId,
      resolveOwnTabId: resolveOwnTabId,
      resolveTabId: resolveTabId
    };
  }

  function readHelperTabIds(_KDB) {
    if (_KDB.state && _KDB.state.launchpad && Array.isArray(_KDB.state.launchpad.helperTabIds)) {
      return _KDB.state.launchpad.helperTabIds.slice();
    }
    return [];
  }

  function resolveWidgetId(item) {
    if (typeof item === "string") {
      return item;
    }
    if (item && item.widgetId) {
      return item.widgetId;
    }
    if (item && item.id) {
      return item.id;
    }
    return null;
  }

  function resolveOwnTabId(_KDB, item) {
    if (item && item.tabId) {
      return item.tabId;
    }
    return null;
  }

  function resolveTabId(_KDB, item, options) {
    return resolveOwnTabId(_KDB, item) || options.tabId || null;
  }

  const sources = readCanvasDiscoverySources();
  return {
    readHelperTabIds: sources.readHelperTabIds,
    resolveWidgetId: sources.resolveWidgetId,
    resolveOwnTabId: sources.resolveOwnTabId,
    resolveTabId: sources.resolveTabId
  };
});
