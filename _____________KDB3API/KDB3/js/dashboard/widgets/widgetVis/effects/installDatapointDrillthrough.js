define([
  "../runtime/ensureWidgetRuntime.js",
  "./readVisualizationFacet.js",
  "./syncDatapointDrillthroughChrome.js"
], function (_ensureWidgetRuntime, _readVisualizationFacet, _syncDatapointDrillthroughChrome) {
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

  function buildInstallContext(_options, _runtime, _stamps) {
    return {
      _KDB: _options._KDB,
      widgetId: _options.widgetId,
      runtime: _runtime,
      drillthroughService: _stamps.drillthroughService,
      sichtApi: _stamps.sichtApi,
      dienststelleApi: _stamps.dienststelleApi,
      tableDataReadRows: _stamps.tableDataReadRows
    };
  }

  function replaceSelectionsUnsubscribe(_runtime, _unsubscribe) {
    var listeners = _runtime.listeners || {};
    _runtime.listeners = listeners;
    if (typeof listeners.drillthroughSelections === "function") {
      listeners.drillthroughSelections();
    }
    listeners.drillthroughSelections = _unsubscribe;
  }

  function onSelectionDto(_ctx, _dto) {
    try {
      _syncDatapointDrillthroughChrome.syncFromSubscribe(_ctx, _dto);
    } catch (err) {
      console.error("[widgetVis.installDatapointDrillthrough] selection", err);
    }
  }

  function subscribeSelections(_ctx, _facet, _widgetId) {
    var unsub;
    if (!_facet || typeof _facet.subscribeSelections !== "function") {
      return null;
    }
    unsub = _facet.subscribeSelections(_widgetId, onSelectionDto.bind(null, _ctx));
    replaceSelectionsUnsubscribe(_ctx.runtime, unsub);
    return unsub;
  }

  function __controller(_options) {
    try {
      var options = _options || {};
      var _KDB = options._KDB;
      var widgetId = options.widgetId;
      var runtime;
      var stamps;
      var ctx;
      if (!readEnableFlag(_KDB)) {
        return { ok: true, skipped: true, reason: "disabled" };
      }
      runtime = _ensureWidgetRuntime(_KDB, widgetId);
      stamps = readStamps(_KDB);
      if (!stamps.drillthroughService || typeof stamps.drillthroughService.openDrillthrough !== "function") {
        return {
          ok: false,
          errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED",
          errorMessage: "missing drillthrough service stamp"
        };
      }
      ctx = buildInstallContext(options, runtime, stamps);
      subscribeSelections(ctx, _readVisualizationFacet(_KDB), widgetId);
      _syncDatapointDrillthroughChrome.syncFromPeek(ctx);
      return { ok: true, skipped: false };
    } catch (err) {
      console.error("[widgetVis.installDatapointDrillthrough]", options && options.widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
  }

  return __controller;
});
