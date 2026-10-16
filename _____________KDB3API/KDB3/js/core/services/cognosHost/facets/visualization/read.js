define([
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../hostOps.js"
], function (_errorCodes, _hostAccess, _hostOps) {
  "use strict";

  var CODES = _errorCodes.visualization;

  function readVisualization(_ctx, _method, _widgetId) {
    return _hostOps.readOp(_ctx, _hostAccess.isValidWidgetId(_widgetId), {
      codes: CODES,
      theme: "visualization",
      method: _method,
      label: "visualization." + _method,
      info: { widgetId: _widgetId },
      call: function (api) {
        return api[_method](_widgetId);
      }
    });
  }

  function createReadOps(_ctx) {
    return {
      getVisType: readVisualization.bind(null, _ctx, "getVisType"),
      getVisTitle: readVisualization.bind(null, _ctx, "getVisTitle")
    };
  }

  return createReadOps;
});
