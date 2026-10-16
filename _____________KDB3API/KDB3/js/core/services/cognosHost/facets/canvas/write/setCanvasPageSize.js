define([
  "../resolveCanvasHostApi.js",
  "../buildCanvasOutcome.js",
  "../config/canvasErrorCodes.js"
], function (_resolveCanvasHostApi, _buildCanvasOutcome, _canvasErrorCodes) {
  "use strict";

  const WIDTH_NAMES = ["pageSizeWidth"];
  const HEIGHT_NAMES = ["pageSizeHeight"];

  function isValidAxis(_axis) {
    return _axis === "width" || _axis === "height";
  }

  function isValidCssPx(_cssPx) {
    return typeof _cssPx === "string" && _cssPx.length >= 2 && _cssPx.slice(-2) === "px";
  }

  function cssPxNumber(_cssPx) {
    let px;
    if (typeof _cssPx !== "string" || _cssPx.slice(-2) !== "px") {
      return null;
    }
    px = parseFloat(_cssPx.slice(0, -2));
    if (isFinite(px)) {
      return Math.round(px);
    }
    return null;
  }

  function isAlreadySet(_current, _cssPx) {
    let px;
    let trimmed;
    if (_current == null) {
      return false;
    }
    if (_current === _cssPx) {
      return true;
    }
    px = cssPxNumber(_cssPx);
    if (px === null) {
      return false;
    }
    if (typeof _current === "number" && isFinite(_current) && Math.round(_current) === px) {
      return true;
    }
    if (typeof _current === "string") {
      trimmed = _current.trim();
      return trimmed === _cssPx || trimmed === String(px) || trimmed === String(px) + "px";
    }
    return false;
  }

  function indexOfExact(_list, _name) {
    var index;
    if (!_list || typeof _list.length !== "number") {
      return -1;
    }
    for (index = 0; index < _list.length; index += 1) {
      if (_list[index] === _name) {
        return index;
      }
    }
    return -1;
  }

  function findPropertyName(_list, _axis) {
    var names = _axis === "width" ? WIDTH_NAMES : HEIGHT_NAMES;
    var index;
    var name;
    for (index = 0; index < names.length; index += 1) {
      name = names[index];
      if (indexOfExact(_list, name) !== -1) {
        return name;
      }
    }
    return null;
  }

  function setPageSizeNow(_ctx, _axis, _cssPx) {
    var canvasApi;
    var list;
    var name;
    var current;
    canvasApi = _resolveCanvasHostApi(_ctx._KDB);
    if (!canvasApi) {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_UNAVAILABLE, []);
    }
    if (typeof canvasApi.getCanvasPropertiesList !== "function") {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    list = canvasApi.getCanvasPropertiesList();
    name = findPropertyName(list, _axis);
    if (!name) {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    if (typeof canvasApi.getCanvasPropertyValue !== "function") {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    current = canvasApi.getCanvasPropertyValue(name);
    if (isAlreadySet(current, _cssPx)) {
      return _buildCanvasOutcome.buildOk();
    }
    if (typeof canvasApi.setCanvasPropertyValue !== "function") {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    canvasApi.setCanvasPropertyValue(name, _cssPx);
    return _buildCanvasOutcome.buildOk();
  }

  function __controller(_ctx, _axis, _cssPx) {
    if (_ctx.isDisposed()) {
      return _buildCanvasOutcome.buildDisposed();
    }
    if (!isValidAxis(_axis) || !isValidCssPx(_cssPx)) {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.INVALID_ID, []);
    }
    try {
      return setPageSizeNow(_ctx, _axis, _cssPx);
    } catch (error) {
      console.error("[cognosHost.canvas.setCanvasPageSize] failed", { axis: _axis }, error);
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.WRITE_FAILED, [
        _buildCanvasOutcome.buildDiagnostic(_canvasErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
