define(["../effects/renderTabWidgets.js"], function (_renderTabWidgets) {
  "use strict";

  // widgetBase/renderTabWidgetsRequested: widgets-owned render readiness API
  // consumed by tabs traverse waitFor: "widgetsRendered" (post-restore render
  // trigger, tabs-writeback-readiness-contractdelta.md §6/§10). The caller
  // guarantees the tab is currently active; this handler only renders and
  // waits, it never activates tabs or mutates widget state.
  function handleRenderTabWidgets(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var tabId = typeof payload.tabId === "string" && payload.tabId.length > 0 ? payload.tabId : null;
    var timeoutMs = typeof payload.timeoutMs === "number" && payload.timeoutMs > 0 ? payload.timeoutMs : undefined;
    if (!tabId) {
      return Promise.resolve({
        ok: false, total: 0, rendered: 0, failed: 0,
        errorCode: "WIDGET_BASE_TAB_UNRESOLVED",
        errorMessage: "renderTabWidgetsRequested requires a non-empty tabId."
      });
    }
    return _renderTabWidgets(_context._KDB, tabId, timeoutMs).catch(function (err) {
      console.error("[widgetBase.handleRenderTabWidgets] failed", tabId, err);
      return {
        ok: false, total: 0, rendered: 0, failed: 0,
        errorCode: "WIDGET_BASE_RENDER_TAB_WIDGETS_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    });
  }

  return handleRenderTabWidgets;
});
