define([
  "../runtime.js",
  "../focus/domQueries.js",
  "../focus/maximizeIcon.js",
  "../../../../core/utils/kit/runtime.js",
  "./click.js",
  "./datapointChrome.js",
  "./icon.js",
  "./spec.js"
], function (_visRuntime, _domQueries, _maximizeIcon, _kitRuntime, _click, _datapointChrome, _icon, _spec) {
  "use strict";

  var DRILLTHROUGH_FAILED = "WIDGET_VIS_DRILLTHROUGH_FAILED";

  function readDrillthroughGate(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    var api = _KDB && _KDB.api ? _KDB.api : {};
    return {
      enabled: !rt || rt.enableDrillthrough !== false,
      stamps: {
        drillthroughService: rt && rt.drillthroughService ? rt.drillthroughService : null,
        tableDataReadRows: rt && typeof rt.tableDataReadRows === "function" ? rt.tableDataReadRows : null,
        sichtApi: api.sicht || null,
        dienststelleApi: api.dienststelle || null
      }
    };
  }

  function hasOpenableService(_stamps) {
    return !!(_stamps.drillthroughService && typeof _stamps.drillthroughService.openDrillthrough === "function");
  }

  function failedResult(_message) {
    return { ok: false, errorCode: DRILLTHROUGH_FAILED, errorMessage: _message };
  }

  function installHeaderIcon(_options) {
    var options = _options || {};
    var _KDB = options._KDB;
    var widgetId = options.widgetId;
    var gate = readDrillthroughGate(_KDB);
    var runtime;
    var hostEl;
    var rendered;
    if (!gate.enabled) {
      return { ok: true, skipped: true, reason: "disabled" };
    }
    try {
      runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
      if (!hasOpenableService(gate.stamps)) {
        return failedResult("missing drillthrough service stamp");
      }
      hostEl = _icon.resolveHeaderIconHost(widgetId, runtime);
      if (!hostEl) {
        return failedResult("missing icon host");
      }
      rendered = _icon.buildDrillthroughIcon({ kind: "header", hostEl: hostEl });
      if (!rendered.ok) {
        return rendered;
      }
      _click.bindDrillthroughClick({
        _KDB: _KDB,
        widgetId: widgetId,
        runtime: runtime,
        anchorEl: rendered.anchorEl,
        listenerKey: "drillthroughIconClick",
        logMissingSpec: true,
        logLabel: "header",
        makeSpec: _spec.assembleDrillthroughSpec.bind(null, {
          _KDB: _KDB,
          widgetId: widgetId,
          sichtApi: gate.stamps.sichtApi,
          dienststelleApi: gate.stamps.dienststelleApi,
          tableDataReadRows: gate.stamps.tableDataReadRows
        })
      });
      runtime.domRefs.drillthroughIconEl = rendered.wrapperEl;
      runtime.drillthrough.installed = true;
      return { ok: true, skipped: false };
    } catch (err) {
      console.error("[widgetVis.installHeaderIcon]", widgetId, err);
      return { ok: false, errorCode: DRILLTHROUGH_FAILED };
    }
  }

  function onSelectionDto(_ctx, _dto) {
    try {
      _datapointChrome.syncFromSubscribe(_ctx, _dto);
    } catch (err) {
      console.error("[widgetVis.onDatapointSelection]", _ctx.widgetId, err);
    }
  }

  function subscribeSelections(_ctx) {
    var facet = _visRuntime.readHostFacet(_ctx._KDB, "visualizationFacet");
    var listeners = _ctx.runtime.listeners;
    var unsubscribe;
    if (!facet || typeof facet.subscribeSelections !== "function") {
      return;
    }
    unsubscribe = facet.subscribeSelections(_ctx.widgetId, onSelectionDto.bind(null, _ctx));
    if (typeof listeners.drillthroughSelections === "function") {
      listeners.drillthroughSelections();
    }
    listeners.drillthroughSelections = unsubscribe;
  }

  function installDatapointSync(_options) {
    var options = _options || {};
    var _KDB = options._KDB;
    var gate = readDrillthroughGate(_KDB);
    var ctx;
    if (!gate.enabled) {
      return { ok: true, skipped: true, reason: "disabled" };
    }
    try {
      ctx = Object.assign({ _KDB: _KDB, widgetId: options.widgetId, runtime: _visRuntime.ensureWidgetRuntime(_KDB, options.widgetId) }, gate.stamps);
      if (!hasOpenableService(gate.stamps)) {
        return failedResult("missing drillthrough service stamp");
      }
      subscribeSelections(ctx);
      _datapointChrome.syncFromPeek(ctx);
      return { ok: true, skipped: false };
    } catch (err) {
      console.error("[widgetVis.installDatapointSync]", options.widgetId, err);
      return { ok: false, errorCode: DRILLTHROUGH_FAILED };
    }
  }

  function installDrillthrough(_options) {
    var iconResult = installHeaderIcon(_options);
    var datapointResult = installDatapointSync(_options);
    if (iconResult.ok === false) {
      return iconResult;
    }
    if (datapointResult.ok === false) {
      return datapointResult;
    }
    return { ok: true, skipped: !!(iconResult.skipped && datapointResult.skipped) };
  }

  function installContentDecorations(_context, _widgetId) {
    if (readDrillthroughGate(_context._KDB).enabled) {
      installDrillthrough({ _KDB: _context._KDB, widgetId: _widgetId });
    }
    _maximizeIcon.installCanvasMaximize({ _KDB: _context._KDB, widgetId: _widgetId });
  }

  function syncDrillthroughAfterFocusExit(_options) {
    var options = _options || {};
    if (_domQueries.isWidgetExpanded(options.widgetId)) {
      return { ok: true, skipped: true, reason: "still_expanded" };
    }
    return installDrillthrough(options);
  }

  function removeNode(_node) {
    if (_node && _node.parentNode) {
      _node.parentNode.removeChild(_node);
      return true;
    }
    return false;
  }

  function releaseDrillthroughEntries(_bucket, _release) {
    var keys = Object.keys(_bucket).filter(function (key) { return key.indexOf("drillthrough") !== -1; });
    keys.forEach(function (key) {
      _release(_bucket[key]);
      delete _bucket[key];
    });
    return keys.length;
  }

  function cleanupDrillthroughDecorations(_runtime, _diagnostics) {
    var domRefs = _runtime.domRefs;
    var listenersRemoved = releaseDrillthroughEntries(_runtime.listeners || {}, function (entry) {
      if (typeof entry === "function") {
        entry();
      }
    });
    var timersCleared = releaseDrillthroughEntries(_runtime.timers || {}, _kitRuntime.cancelTimer);
    if (domRefs) {
      if (removeNode(domRefs.drillthroughIconEl)) {
        _diagnostics.drillthroughIconRemoved = true;
      }
      if (removeNode(domRefs.datapointDrillthroughIconEl)) {
        _diagnostics.datapointDrillthroughIconRemoved = true;
      }
      domRefs.drillthroughIconEl = null;
      domRefs.datapointDrillthroughIconEl = null;
    }
    _runtime.drillthrough = { installed: false, lastSelectionEvent: null, pendingSelectionEvents: [], captureActive: false };
    _diagnostics.drillthrough = { listenersRemoved: listenersRemoved, timersCleared: timersCleared, runtimeReset: true };
  }

  return {
    readDrillthroughGate: readDrillthroughGate,
    installDrillthrough: installDrillthrough,
    installContentDecorations: installContentDecorations,
    cleanupDrillthroughDecorations: cleanupDrillthroughDecorations,
    syncDrillthroughAfterFocusExit: syncDrillthroughAfterFocusExit
  };
});
