define([], function () {
  function __controller(_context, _action) {
    try {
      return Promise.resolve({
        ok: true,
        widgetId: _action.widgetId,
        opSeq: _action.opSeq,
        skipped: true,
        reasonCode: "WIDGET_TEXT_TITLE_DROPDOWN_DISPLAY_ONLY"
      });
    } catch (err) {
      console.error("[widgetText.handleApplyTitle] failed", err);
      return Promise.resolve({
        ok: false,
        widgetId: _action.widgetId,
        errorCode: "WIDGET_TEXT_EDIT_COMMIT_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      });
    }
  }
  return __controller;
});
