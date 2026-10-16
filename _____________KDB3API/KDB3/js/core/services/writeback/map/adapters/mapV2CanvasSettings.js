define([
  "../../../../utils/convertUnitToPx.js",
], function (_convertUnitToPx) {
  "use strict";

  function parseDimension(_value) {
    if (typeof _value === "number" && isFinite(_value)) {
      return Math.round(_value);
    }
    return _convertUnitToPx(_value);
  }

  function readCanvasSize(_canvas, _configuration) {
    const fromCanvas = _canvas && typeof _canvas === "object" ? _canvas : {};
    const fromConfig = _configuration && typeof _configuration === "object" ? _configuration : {};
    const width = parseDimension(fromCanvas.width != null ? fromCanvas.width : fromConfig.dashboardWidth);
    const height = parseDimension(fromCanvas.height != null ? fromCanvas.height : fromConfig.dashboardHeight);
    if (width === null || height === null) {
      return null;
    }
    return { w: width, h: height };
  }

  function assignColour(_target, _key, _value) {
    if (typeof _value === "string" && _value.trim() !== "") {
      _target[_key] = _value;
    }
  }

  function assignNewwgDims(_target, _prefix, _configuration) {
    const width = parseDimension(_configuration[_prefix + "Width"]);
    const height = parseDimension(_configuration[_prefix + "Height"]);
    const bgKey = _prefix + "BackgroundColor";
    if (width !== null) {
      _target.w = width;
    }
    if (height !== null) {
      _target.h = height;
    }
    assignColour(_target, "bg", _configuration[bgKey]);
  }

  function mapConfiguration(_configuration) {
    if (!_configuration || typeof _configuration !== "object") {
      return null;
    }
    const sett = {};
    const dash = {};
    assignColour(dash, "bg", _configuration.dashboardColor);
    if (_configuration.dashboardSettingIcons === true) {
      dash.hidWs = 1;
    }
    if (Object.keys(dash).length > 0) {
      sett.dash = dash;
    }
    const panel = {};
    assignColour(panel, "bg", _configuration.controlBackgroundColor);
    assignColour(panel, "btn", _configuration.controlButtonColor);
    assignColour(panel, "act", _configuration.controlActionButton);
    if (Object.keys(panel).length > 0) {
      sett.panel = panel;
    }
    const newwg = {};
    const vis = {};
    const txt = {};
    assignNewwgDims(vis, "visualization", _configuration);
    assignNewwgDims(txt, "text", _configuration);
    if (Object.keys(vis).length > 0) {
      newwg.vis = vis;
    }
    if (Object.keys(txt).length > 0) {
      newwg.txt = txt;
    }
    if (Object.keys(newwg).length > 0) {
      sett.newwg = newwg;
    }
    return Object.keys(sett).length > 0 ? sett : null;
  }

  function mapV2CanvasSettings(_payload) {
    try {
      const result = {};
      const canv = readCanvasSize(_payload.canvas, _payload.configuration);
      if (canv) {
        result.canv = canv;
      }
      const sett = mapConfiguration(_payload.configuration);
      if (sett) {
        result.sett = sett;
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  return mapV2CanvasSettings;
});
