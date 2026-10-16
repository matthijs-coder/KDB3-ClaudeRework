define([
  "./createWidgetTopNController.js",
  "./state/selectors.js"
], function (_createWidgetTopNController, _selectors) {
  "use strict";

  // Lifecycle terms for widgetTopN:
  //   idle, initializing, ready, error, disposed.
  function stampHostFacets(_KDB) {
    var service = _KDB.services && _KDB.services.cognosHost ? _KDB.services.cognosHost : null;
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.widgetTopN = _KDB.runtime.widgetTopN || {};
    _KDB.runtime.widgetTopN.widgetsFacet = service && service.widgets ? service.widgets : null;
  }

  function __orchestrator(_KDB, _options) {
    stampHostFacets(_KDB);
    var controller = _createWidgetTopNController({ _KDB: _KDB, options: _options || {}, selectors: _selectors });
    _KDB.api = _KDB.api || {};
    _KDB.api.widgetTopN = controller;
    return controller;
  }

  return __orchestrator;
});
