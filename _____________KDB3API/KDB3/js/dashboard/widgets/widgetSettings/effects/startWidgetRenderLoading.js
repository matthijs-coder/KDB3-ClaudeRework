define([], function () {
  function __controller(_KDB, _context) {
    try {
      const widgetId = String(_context && _context.widgetId || "");
      const widgetEl = _context && _context.widgetEl;
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      let handle;
      if (!shouldStartWidgetRenderLoading(_context, widgetEl, widgetId)) {
        return;
      }
      if (!loading || typeof loading.startLoading !== "function") {
        return;
      }
      handle = loading.startLoading({
        mountEl: widgetEl,
        mountKey: "kdb-widget-render-loading-" + widgetId,
        messageKey: "chart"
      });
      storeWidgetRenderLoadingHandle(_KDB, widgetId, handle);
    } catch (err) {
      console.error("[widgetSettings.startWidgetRenderLoading] failed", { widgetId: _context && _context.widgetId }, err);
    }
  }

  function shouldStartWidgetRenderLoading(_context, widgetEl, widgetId) {
    try {
      if (!_context || !widgetId) {
        return false;
      }
      if (!widgetEl || widgetEl.nodeType !== 1) {
        return false;
      }
      if (_context.widgetType !== "live") {
        return false;
      }
      if (_context.isHistoryReplay === true || _context.source === "historyReplay") {
        return false;
      }
      return true;
    } catch (err) {
      console.error("[widgetSettings.shouldStartWidgetRenderLoading] failed", { widgetId: widgetId }, err);
      return false;
    }
  }

  function storeWidgetRenderLoadingHandle(_KDB, widgetId, handle) {
    try {
      const settingsRt = _KDB && _KDB.runtime ? _KDB.runtime.widgetSettings : null;
      if (!handle) {
        return;
      }
      if (!settingsRt) {
        return;
      }
      settingsRt.pendingPromises = settingsRt.pendingPromises || {};
      settingsRt.pendingPromises["renderLoading:" + widgetId] = handle;
    } catch (err) {
      console.error("[widgetSettings.storeWidgetRenderLoadingHandle] failed", { widgetId: widgetId }, err);
    }
  }

  return __controller;
});
