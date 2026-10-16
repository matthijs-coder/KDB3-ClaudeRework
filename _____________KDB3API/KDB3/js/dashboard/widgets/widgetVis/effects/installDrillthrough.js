define([
  "../runtime.js",
  "../dom.js",
  "../view/renderDrillthroughIcon.js",
  "./bindDrillthroughIconClick.js",
  "./focusMode/domQueries.js",
  "../view/ensureExpandDrillthroughHost.js"
], function (_visRuntime, _dom, _renderDrillthroughIcon, _bindDrillthroughIconClick, _domQueries, _ensureExpandDrillthroughHost) {
  "use strict";

  function readEnableFlag(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    return !rt || rt.enableDrillthrough !== false;
  }

  function readStamps(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    var api = _KDB && _KDB.api ? _KDB.api : {};
    return {
      drillthroughService: rt && rt.drillthroughService ? rt.drillthroughService : null,
      tableDataReadRows: rt && typeof rt.tableDataReadRows === "function" ? rt.tableDataReadRows : null,
      sichtApi: api.sicht || null,
      dienststelleApi: api.dienststelle || null
    };
  }

  function ensureIconsHost(_header) {
    var host;
    if (!_header) {
      return null;
    }
    host = _header.querySelector(".widgetIcons");
    if (host) {
      return host;
    }
    host = document.createElement("div");
    host.className = "widgetIcons";
    _header.appendChild(host);
    return host;
  }

  function resolveIconHost(_widgetId, _runtime) {
    var header;
    var content;
    try {
      if (_domQueries.isWidgetExpanded(_widgetId)) {
        return _ensureExpandDrillthroughHost(_widgetId);
      }
      content = _dom.resolveVisualizationContent(_widgetId);
      header = content && content.headerEl ? content.headerEl : null;
      if (!header && _runtime && _runtime.domRefs) {
        header = _runtime.domRefs.headerEl;
      }
      return ensureIconsHost(header);
    } catch (err) {
      console.error("[widgetVis.installDrillthrough] resolveIconHost", _widgetId, err);
      return null;
    }
  }

  function __controller(_options) {
    try {
      var options = _options || {};
      var _KDB = options._KDB;
      var widgetId = options.widgetId;
      var runtime;
      var stamps;
      var hostEl;
      var rendered;
      if (!readEnableFlag(_KDB)) {
        return { ok: true, skipped: true, reason: "disabled" };
      }
      runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
      stamps = readStamps(_KDB);
      if (!stamps.drillthroughService || typeof stamps.drillthroughService.openDrillthrough !== "function") {
        return {
          ok: false,
          errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED",
          errorMessage: "missing drillthrough service stamp"
        };
      }
      hostEl = resolveIconHost(widgetId, runtime);
      if (!hostEl) {
        return {
          ok: false,
          errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED",
          errorMessage: "missing icon host"
        };
      }
      rendered = _renderDrillthroughIcon({
        hostEl: hostEl
      });
      if (!rendered || rendered.ok !== true) {
        return rendered || {
          ok: false,
          errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED",
          errorMessage: "icon plant failed"
        };
      }
      _bindDrillthroughIconClick({
        _KDB: _KDB,
        widgetId: widgetId,
        anchorEl: rendered.anchorEl,
        runtime: runtime,
        drillthroughService: stamps.drillthroughService,
        sichtApi: stamps.sichtApi,
        dienststelleApi: stamps.dienststelleApi,
        tableDataReadRows: stamps.tableDataReadRows
      });
      runtime.domRefs = runtime.domRefs || {};
      runtime.domRefs.drillthroughIconEl = rendered.wrapperEl;
      runtime.drillthrough = runtime.drillthrough || {};
      runtime.drillthrough.installed = true;
      return { ok: true, skipped: false };
    } catch (err) {
      console.error("[widgetVis.installDrillthrough]", options && options.widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
  }

  return __controller;
});
