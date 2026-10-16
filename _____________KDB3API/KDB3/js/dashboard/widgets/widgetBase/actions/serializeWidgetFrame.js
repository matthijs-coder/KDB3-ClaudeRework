define([
  "../../../../core/services/writeback/get/collectors/buildWidgetObject.js",
  "../history/resolveCanvasLayoutFromFrame.js"
], function (_buildWidgetObject, _layoutFrame) {
  "use strict";

  function readApiState(_KDB, _owner) {
    const api = _KDB && _KDB.api && _KDB.api[_owner];
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  // Same canvas-px source as the frame layout resolver. Duplicate prepare does not read live DOM.
  function stampCanvasLayout(_frame) {
    const layout = _layoutFrame.resolveCanvasLayoutFromFrame(_frame);
    if (!layout) {
      return _frame || {};
    }
    return Object.assign({}, _frame, { layout: layout });
  }

  function serializeWidgetFrame(_KDB, _frame, _tabIdx) {
    const diagnostics = [];
    const widgetId = _frame && _frame.widgetId ? _frame.widgetId : null;
    try {
      const frame = stampCanvasLayout(_frame);
      const settingsByWidget = (readApiState(_KDB, "widgetSettings") || {}).byWidget || {};
      const visById = (readApiState(_KDB, "widgetVis") || {}).byId || {};
      const textById = (readApiState(_KDB, "widgetText") || {}).byId || {};
      const entry = _buildWidgetObject(
        frame,
        _tabIdx,
        settingsByWidget[widgetId],
        visById[widgetId],
        textById[widgetId],
        diagnostics
      );
      if (entry === null) {
        return { ok: false, entry: null, diagnostics: diagnostics };
      }
      return { ok: true, entry: entry, diagnostics: diagnostics };
    } catch (err) {
      console.error("[widgetBase.serializeWidgetFrame] failed", { widgetId: widgetId }, err);
      return {
        ok: false,
        entry: null,
        diagnostics: diagnostics.concat([{
          code: "WRITEBACK_WIDGET_RESTORE_FAILED",
          message: String(err && err.message ? err.message : err)
        }])
      };
    }
  }

  return serializeWidgetFrame;
});
