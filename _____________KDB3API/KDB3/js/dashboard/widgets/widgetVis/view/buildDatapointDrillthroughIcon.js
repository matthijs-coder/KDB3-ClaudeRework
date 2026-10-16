define([
  "../config.js"
], function (_config) {
  "use strict";

  function findExistingWrapper(_host, _wrapperClass) {
    var i;
    var child;
    if (!_host || !_host.children) {
      return null;
    }
    for (i = 0; i < _host.children.length; i += 1) {
      child = _host.children[i];
      if (child.classList && child.classList.contains(_wrapperClass)) {
        return child;
      }
    }
    return null;
  }

  function findExistingAnchor(_wrapper, _iconClass) {
    return _wrapper ? _wrapper.querySelector("." + _iconClass) : null;
  }

  function createWrapper(_wrapperClass) {
    var wrapper = document.createElement("div");
    wrapper.className = _wrapperClass;
    wrapper.setAttribute("role", "application");
    return wrapper;
  }

  function createAnchor(_cfg) {
    var anchor = document.createElement("a");
    anchor.className = _cfg.drillthroughIconClass;
    anchor.href = "#";
    anchor.title = _cfg.datapointDrillthroughIconTitle;
    return anchor;
  }

  function stampTitle(_anchor, _cfg) {
    if (_anchor) {
      _anchor.title = _cfg.datapointDrillthroughIconTitle;
    }
  }

  function __controller(_options) {
    try {
      var options = _options || {};
      var hostEl = options.hostEl;
      var wrapperClass = options.wrapperClass || _config.datapointDrillthroughWrapperClass;
      var iconClass = options.iconClass || _config.drillthroughIconClass;
      var existingWrapper = findExistingWrapper(hostEl, wrapperClass);
      var existingAnchor = findExistingAnchor(existingWrapper, iconClass);
      var wrapperEl;
      var anchorEl;
      if (existingWrapper && existingAnchor) {
        stampTitle(existingAnchor, _config);
        return { ok: true, wrapperEl: existingWrapper, anchorEl: existingAnchor };
      }
      if (existingWrapper) {
        anchorEl = createAnchor(_config);
        existingWrapper.appendChild(anchorEl);
        return { ok: true, wrapperEl: existingWrapper, anchorEl: anchorEl };
      }
      wrapperEl = createWrapper(wrapperClass);
      anchorEl = createAnchor(_config);
      wrapperEl.appendChild(anchorEl);
      return { ok: true, wrapperEl: wrapperEl, anchorEl: anchorEl };
    } catch (err) {
      console.error("[widgetVis.buildDatapointDrillthroughIcon]", err);
      return {
        ok: false,
        errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    }
  }

  return __controller;
});
