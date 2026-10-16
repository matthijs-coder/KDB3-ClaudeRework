define([
  "../config.js",
  "../dom.js",
  "../focus/domQueries.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_config, _dom, _domQueries, _widgetChrome) {
  "use strict";

  var HEADER_TITLE = "PKZ Analysetool";
  var chrome = _widgetChrome.widget.strings;
  var focus = _widgetChrome.focusMode.strings;

  function failedResult(_message) {
    return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED", errorMessage: _message };
  }

  function createWrapper(_className) {
    var wrapper = document.createElement("div");
    wrapper.className = _className;
    wrapper.setAttribute("role", "application");
    return wrapper;
  }

  function createAnchor(_title) {
    var anchor = document.createElement("a");
    anchor.className = _config.drillthroughIconClass;
    anchor.href = "#";
    anchor.title = _title;
    return anchor;
  }

  function findChildWithClass(_host, _className) {
    var i;
    var child;
    var children = _host && _host.children ? _host.children : [];
    for (i = 0; i < children.length; i += 1) {
      child = children[i];
      if (child.classList && child.classList.contains(_className)) {
        return child;
      }
    }
    return null;
  }

  function buildHeaderIcon(_hostEl, _title) {
    var existing = _hostEl.querySelector("." + _config.drillthroughIconClass);
    var wrapperEl;
    var anchorEl;
    if (existing) {
      wrapperEl = existing.closest
        ? existing.closest("." + chrome.dataWidgetIconClass + "." + chrome.liveWidgetAnnotationsClass)
          || existing.closest("." + chrome.dataWidgetIconClass)
          || existing.parentNode
        : existing.parentNode;
      return { ok: true, wrapperEl: wrapperEl, anchorEl: existing };
    }
    wrapperEl = createWrapper(chrome.dataWidgetIconClass + " " + chrome.liveWidgetAnnotationsClass);
    anchorEl = createAnchor(_title);
    wrapperEl.appendChild(anchorEl);
    _hostEl.insertBefore(wrapperEl, _hostEl.firstChild);
    return { ok: true, wrapperEl: wrapperEl, anchorEl: anchorEl };
  }

  function buildDatapointIcon(_hostEl, _title) {
    var wrapperClass = _config.datapointDrillthroughWrapperClass;
    var existingWrapper = findChildWithClass(_hostEl, wrapperClass);
    var existingAnchor = existingWrapper ? existingWrapper.querySelector("." + _config.drillthroughIconClass) : null;
    var wrapperEl;
    var anchorEl;
    if (existingAnchor) {
      existingAnchor.title = _title;
      return { ok: true, wrapperEl: existingWrapper, anchorEl: existingAnchor };
    }
    anchorEl = createAnchor(_title);
    wrapperEl = existingWrapper || createWrapper(wrapperClass);
    wrapperEl.appendChild(anchorEl);
    return { ok: true, wrapperEl: wrapperEl, anchorEl: anchorEl };
  }

  function buildDrillthroughIcon(_options) {
    var options = _options || {};
    var isHeader = options.kind === "header";
    var title = options.title || (isHeader ? HEADER_TITLE : _config.datapointDrillthroughIconTitle);
    if (!options.hostEl) {
      return failedResult("missing icon host");
    }
    return isHeader ? buildHeaderIcon(options.hostEl, title) : buildDatapointIcon(options.hostEl, title);
  }

  function ensureExpandDrillthroughHost(_widgetId) {
    var columnClass = _config.expandDrillthroughColumnClass;
    var container = _widgetId ? _domQueries.resolveExpandModeContainer(_widgetId) : null;
    var column;
    var collapse;
    if (!container) {
      return null;
    }
    column = container.querySelector("." + columnClass);
    if (column) {
      return column;
    }
    column = document.createElement("div");
    column.className = columnClass;
    collapse = container.querySelector(focus.collapseSvgFocusModeSelector) || container.querySelector(focus.collapseSvgSelector);
    if (collapse && collapse.parentNode) {
      collapse.insertAdjacentElement("afterend", column);
    } else {
      container.appendChild(column);
    }
    return column;
  }

  function ensureIconsHost(_header) {
    var host = _header ? _header.querySelector(".widgetIcons") : null;
    if (host || !_header) {
      return host;
    }
    host = document.createElement("div");
    host.className = "widgetIcons";
    _header.appendChild(host);
    return host;
  }

  function resolveHeaderIconHost(_widgetId, _runtime) {
    var content;
    var header;
    if (_domQueries.isWidgetExpanded(_widgetId)) {
      return ensureExpandDrillthroughHost(_widgetId);
    }
    content = _dom.resolveVisualizationContent(_widgetId);
    header = content && content.headerEl ? content.headerEl : null;
    if (!header && _runtime && _runtime.domRefs) {
      header = _runtime.domRefs.headerEl;
    }
    return ensureIconsHost(header);
  }

  function isMaximizable(_widgetEl) {
    return !!(_widgetEl.classList && _widgetEl.classList.contains("maximizable"));
  }

  function hasTopRightResizeEdge(_widgetEl) {
    var i;
    var child;
    for (i = 0; i < (_widgetEl.children || []).length; i += 1) {
      child = _widgetEl.children[i];
      if (child.classList && child.classList.contains("resizeEdge") && child.classList.contains("topRight")) {
        return true;
      }
    }
    return false;
  }

  function placeDatapointDrillthroughIcon(_options) {
    var widgetId = _options.widgetId;
    var isExpanded = _domQueries.isWidgetExpanded(widgetId);
    var widgetEl = isExpanded ? ensureExpandDrillthroughHost(widgetId) : _domQueries.resolveWidgetElement(widgetId);
    var built;
    if (!widgetEl) {
      return { ok: true, skipped: true, reason: "missing host" };
    }
    if (!isExpanded && !isMaximizable(widgetEl)) {
      return { ok: true, skipped: true, reason: "not maximizable" };
    }
    if (!isExpanded && !hasTopRightResizeEdge(widgetEl)) {
      return { ok: true, skipped: true, reason: "missing resizeEdge" };
    }
    built = buildDrillthroughIcon({ kind: "datapoint", hostEl: widgetEl });
    if (built.wrapperEl.parentNode !== widgetEl) {
      widgetEl.appendChild(built.wrapperEl);
    }
    return { ok: true, skipped: false, wrapperEl: built.wrapperEl, anchorEl: built.anchorEl };
  }

  return {
    buildDrillthroughIcon: buildDrillthroughIcon,
    ensureExpandDrillthroughHost: ensureExpandDrillthroughHost,
    resolveHeaderIconHost: resolveHeaderIconHost,
    placeDatapointDrillthroughIcon: placeDatapointDrillthroughIcon
  };
});
