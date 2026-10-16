define([
  "../config/imagePaths.js",
  "../config/selectors.js"
], function (_imagePaths, _selectors) {
  function __controller(_KDB, _context) {
    try {
      const toolbar = document.createElement("div");
      const image = document.createElement("input");
      toolbar.className = "KDB_widgetSettingsButton";
      toolbar.classList.add(_context.widgetType === "text" ? _selectors.textWidgetClassName : _selectors.liveWidgetClassName);
      toolbar.setAttribute("aria-label", "WidgetSettings");
      toolbar.setAttribute("data-kdb-widget-toolbar", String(_context.widgetId));
      image.type = "image";
      image.className = _selectors.svgIconClass;
      image.src = _imagePaths.readImagePath(_KDB) + "settings.svg";
      image.alt = "Widget settings";
      image.setAttribute("data-kdb-widget-settings-toggle", "1");
      toolbar.appendChild(image);
      return toolbar;
    } catch (err) {
      console.error("[widgetSettings.buildWidgetToolbar] failed", { widgetId: _context && _context.widgetId }, err);
      throw err;
    }
  }

  return __controller;
});
