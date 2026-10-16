define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js"
], function (_outcome, _errorCodes, _hostAccess) {
  "use strict";

  var CODES = _errorCodes.canvas;

  function isValidAxis(_axis) {
    return _axis === "width" || _axis === "height";
  }

  function isValidCssPx(_cssPx) {
    return typeof _cssPx === "string" && _cssPx.length >= 2 && _cssPx.slice(-2) === "px";
  }

  function cssPxNumber(_cssPx) {
    var px;
    if (typeof _cssPx !== "string" || _cssPx.slice(-2) !== "px") {
      return null;
    }
    px = parseFloat(_cssPx.slice(0, -2));
    return isFinite(px) ? Math.round(px) : null;
  }

  function isAlreadySet(_current, _cssPx) {
    var px;
    var trimmed;
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

  // Exact-name lookup in the host property list (array-like).
  function findPropertyName(_list, _axis) {
    var name = _axis === "width" ? "pageSizeWidth" : "pageSizeHeight";
    var index;
    if (!_list || typeof _list.length !== "number") {
      return null;
    }
    for (index = 0; index < _list.length; index += 1) {
      if (_list[index] === name) {
        return name;
      }
    }
    return null;
  }

  function setPageSizeNow(_ctx, _axis, _cssPx) {
    var resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "canvas", "getCanvasPropertiesList", CODES);
    var canvasApi;
    var name;
    if (resolved.failure) {
      return resolved.failure;
    }
    canvasApi = resolved.api;
    name = findPropertyName(canvasApi.getCanvasPropertiesList(), _axis);
    if (!name || typeof canvasApi.getCanvasPropertyValue !== "function") {
      return _outcome.buildFailed(CODES.HOST_CAPABILITY_MISSING, []);
    }
    if (isAlreadySet(canvasApi.getCanvasPropertyValue(name), _cssPx)) {
      return _outcome.buildOk();
    }
    if (typeof canvasApi.setCanvasPropertyValue !== "function") {
      return _outcome.buildFailed(CODES.HOST_CAPABILITY_MISSING, []);
    }
    canvasApi.setCanvasPropertyValue(name, _cssPx);
    return _outcome.buildOk();
  }

  function setCanvasPageSize(_ctx, _axis, _cssPx) {
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (!isValidAxis(_axis) || !isValidCssPx(_cssPx)) {
      return _outcome.buildFailed(CODES.INVALID_ID, []);
    }
    try {
      return setPageSizeNow(_ctx, _axis, _cssPx);
    } catch (error) {
      console.error("[cognosHost.canvas.setCanvasPageSize] failed", { axis: _axis }, error);
      return _outcome.buildFailed(CODES.WRITE_FAILED, [_outcome.buildDiagnostic(CODES.WRITE_FAILED, error && error.message)]);
    }
  }

  return setCanvasPageSize;
});
