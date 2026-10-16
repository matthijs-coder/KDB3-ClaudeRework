define([
  "./resolveWidgetShell.js",
  "./applyShellLayoutStyles.js"
], function (_resolveWidgetShellModule, _applyShellLayoutStyles) {
  const _resolveWidgetShell = _resolveWidgetShellModule.resolveWidgetShell;

  function applyWidgetLayout(_KDB, _widgetId, _layout) {
    return Promise.resolve(applyLayoutSync(_KDB, _widgetId, _layout));
  }

  function applyLayoutSync(_KDB, widgetId, layout) {
    const shellEl = _resolveWidgetShell(_KDB, widgetId);
    if (!shellEl || !layout) {
      return { ok: false, layout: layout, errorCode: "WIDGET_BASE_COGNOS_LAYOUT_FAILED", errorMessage: "Layout target unavailable." };
    }
    try {
      _applyShellLayoutStyles(shellEl, layout);
      return { ok: true, layout: layout };
    } catch (err) {
      console.error("[widgetBase.applyWidgetLayout] layout effect failed", widgetId, err);
      return { ok: false, layout: layout, errorCode: "WIDGET_BASE_COGNOS_LAYOUT_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  return applyWidgetLayout;
});
