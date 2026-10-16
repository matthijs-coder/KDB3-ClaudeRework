define([
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../hostOps.js"
], function (_errorCodes, _hostAccess, _hostOps) {
  "use strict";

  var CODES = _errorCodes.visualization;

  function isPresent(_value) {
    return _value != null && _value !== "";
  }

  function writeProperty(_ctx, _options, _valid, _method, _label, _info, _call) {
    return _hostOps.writeOp(_ctx, _options, _valid, {
      codes: CODES,
      theme: "visualization",
      method: _method,
      label: "visualization." + _label,
      info: _info,
      call: _call
    });
  }

  function setVisType(_ctx, _widgetId, _visType, _options) {
    return writeProperty(
      _ctx, _options, _hostAccess.isValidWidgetId(_widgetId) && isPresent(_visType), "setVisType", "setVisType",
      { widgetId: _widgetId },
      function (api) { return api.setVisType(_visType, _widgetId); }
    );
  }

  function setVisTitle(_ctx, _widgetId, _titleText, _options) {
    return writeProperty(
      _ctx, _options, _hostAccess.isValidWidgetId(_widgetId) && typeof _titleText === "string" && _titleText !== "",
      "setVisTitle", "setVisTitle", { widgetId: _widgetId },
      function (api) { return api.setVisTitle(_titleText, _widgetId); }
    );
  }

  function setContentProperty(_ctx, _widgetId, _key, _value, _options) {
    return writeProperty(
      _ctx, _options, _hostAccess.isValidWidgetId(_widgetId) && typeof _key === "string" && _key !== "",
      "setContentPropertyValue", "setContentProperty", { widgetId: _widgetId, key: _key },
      function (api) { return api.setContentPropertyValue(_widgetId, _key, _value); }
    );
  }

  function setDataSource(_ctx, _widgetId, _dataSourceId, _options) {
    return writeProperty(
      _ctx, _options, _hostAccess.isValidWidgetId(_widgetId) && isPresent(_dataSourceId), "setVizDataSource", "setDataSource",
      { widgetId: _widgetId },
      function (api) { return api.setVizDataSource(_dataSourceId, _widgetId); }
    );
  }

  function createPropertyOps(_ctx) {
    return {
      setVisType: setVisType.bind(null, _ctx),
      setVisTitle: setVisTitle.bind(null, _ctx),
      setContentProperty: setContentProperty.bind(null, _ctx),
      setDataSource: setDataSource.bind(null, _ctx)
    };
  }

  return createPropertyOps;
});
