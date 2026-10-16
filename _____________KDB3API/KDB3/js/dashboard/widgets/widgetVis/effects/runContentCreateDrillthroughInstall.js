define([
  "./installAllDrillthrough.js",
  "./installCanvasMaximize.js"
], function (_installDrillthrough, _installCanvasMaximize) {
  "use strict";

  function __controller(_context, _widgetId) {
    try {
      var rt = _context._KDB.runtime && _context._KDB.runtime.widgetVis;
      if (!rt || rt.enableDrillthrough !== false) {
        _installDrillthrough({ _KDB: _context._KDB, widgetId: _widgetId });
      }
    } catch (err) {
      console.error("[widgetVis.runContentCreateDrillthroughInstall] drillthrough", _widgetId, err);
    }
    try {
      _installCanvasMaximize({ _KDB: _context._KDB, widgetId: _widgetId });
    } catch (err) {
      console.error("[widgetVis.runContentCreateDrillthroughInstall] maximize", _widgetId, err);
    }
  }

  return __controller;
});
