define([
  "../../../../core/cognosHost/config/widgetChromeSelectors.js",
  "../config.js"
], function (_widgetChrome, _config) {
  "use strict";

  function readChrome() {
    return {
      widget: _widgetChrome.widget.strings,
      focusMode: _widgetChrome.focusMode.strings
    };
  }

  function findExistingIcon(_host, _iconClass) {
    return _host.querySelector("." + _iconClass);
  }

  function ensureWrapper(_host, _chrome) {
    var wrapper = document.createElement("div");
    wrapper.className = _chrome.dataWidgetIconClass + " " + _chrome.liveWidgetAnnotationsClass;
    wrapper.setAttribute("role", "application");
    return wrapper;
  }

  function createAnchor(_cfg) {
    var anchor = document.createElement("a");
    anchor.className = _cfg.drillthroughIconClass;
    anchor.href = "#";
    anchor.title = "PKZ Analysetool";
    return anchor;
  }

  function __controller(_options) {
    try {
      var options = _options || {};
      var hostEl = options.hostEl;
      var iconClass = options.iconClass || _config.drillthroughIconClass;
      var chrome = readChrome().widget;
      var existing;
      var wrapperEl;
      var anchorEl;
      if (!hostEl) {
        return {
          ok: false,
          errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED",
          errorMessage: "missing icon host"
        };
      }
      existing = findExistingIcon(hostEl, iconClass);
      if (existing) {
        wrapperEl = existing.closest
          ? existing.closest("." + chrome.dataWidgetIconClass + "." + chrome.liveWidgetAnnotationsClass)
            || existing.closest("." + chrome.dataWidgetIconClass)
            || existing.parentNode
          : existing.parentNode;
        return { ok: true, wrapperEl: wrapperEl, anchorEl: existing };
      }
      wrapperEl = ensureWrapper(hostEl, chrome);
      anchorEl = createAnchor(_config);
      wrapperEl.appendChild(anchorEl);
      if (hostEl.firstChild) {
        hostEl.insertBefore(wrapperEl, hostEl.firstChild);
      } else {
        hostEl.appendChild(wrapperEl);
      }
      return { ok: true, wrapperEl: wrapperEl, anchorEl: anchorEl };
    } catch (err) {
      console.error("[widgetVis.renderDrillthroughIcon]", err);
      return {
        ok: false,
        errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    }
  }

  return __controller;
});
