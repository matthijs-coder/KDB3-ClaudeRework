define([
  "./buildDrillthroughUrl.js",
  "./effects/openBlankWindow.js",
  "./diagnostics/createBuildResult.js",
  "./diagnostics/logDrillthroughOpen.js",
  "./config.js",
  "./effects/writeDrillthroughWaitDocument.js",
  "./effects/finishDeferredDrillthroughOpen.js"
], function (_buildDrillthroughUrl, _openBlankWindow, _createBuildResult, _logDrillthroughOpen, _config, _writeDrillthroughWaitDocument, _finishDeferredDrillthroughOpen) {
  "use strict";

  function logBuilt(_built) {
    try {
      if (!_built) {
        return;
      }
      _logDrillthroughOpen(_built);
    } catch (err) {
      console.error("[drillthrough.openDrillthrough] log failed", err);
    }
  }
  function withOpenOperation(_built, _ok, _code, _message, _stage) {
    var diag = _built && _built.diagnostics ? _built.diagnostics : {};
    return _createBuildResult({
      ok: _ok === true,
      errorCode: _code == null ? null : _code,
      errorMessage: _message == null ? null : _message,
      url: _built && _built.url ? _built.url : null,
      source: _built && _built.source ? _built.source : null,
      widgetId: _built && _built.widgetId != null ? _built.widgetId : null,
      drillConfig: _built && _built.drillConfig ? _built.drillConfig : null,
      diagnostics: {
        operation: "openDrillthrough",
        hostEnv: diag.hostEnv == null ? null : diag.hostEnv,
        failedStage: _stage,
        warnings: diag.warnings || []
      }
    });
  }

  function hierarchyTableKey(_spec, _keys) {
    return String(_spec && _spec.sicht || "").toUpperCase().trim() === "DEZPV" ? _keys.DEZPV : _keys.BW;
  }
  function returnFailure(_built) {
    var diag;
    logBuilt(_built);
    diag = _built && _built.diagnostics ? _built.diagnostics : {};
    return withOpenOperation(_built, false, _built && _built.errorCode, _built && _built.errorMessage, diag.failedStage);
  }
  function returnBlocked(_built) {
    return withOpenOperation(_built, false, "DRILLTHROUGH_OPEN_BLOCKED", "window.open returned null", "openWindow");
  }
  function returnInternal(_err) {
    return _createBuildResult({
      ok: false,
      errorCode: "DRILLTHROUGH_OPEN_INTERNAL",
      errorMessage: _err && _err.message ? String(_err.message) : "open failed",
      diagnostics: { operation: "openDrillthrough", failedStage: "openWindow", warnings: [] }
    });
  }
  function returnPending(_spec) {
    return _createBuildResult({
      ok: true,
      errorCode: null,
      errorMessage: null,
      url: null,
      source: _spec && _spec.source != null ? _spec.source : null,
      widgetId: (_spec && _spec.widgetId) || null,
      drillConfig: null,
      diagnostics: {
        operation: "openDrillthrough",
        failedStage: null,
        warnings: [{ code: "DRILLTHROUGH_HIERARCHY_PENDING", message: "Hierarchy load already in flight." }]
      }
    });
  }
  function closeIfOpen(_handle) {
    try {
      if (_handle && _handle.closed !== true) {
        _handle.close();
      }
    } catch (err) {
      console.error("[drillthrough.openDrillthrough]", err);
    }
  }

  function openPendingOrFail(_spec, _deps, _built, _slot) {
    var tableKey;
    var pending;
    var handle;
    if (!_built || _built.errorCode !== "DRILLTHROUGH_ORG_TREE_MISSING") {
      return returnFailure(_built);
    }
    if (!_deps || typeof _deps.readPendingLoad !== "function") {
      return returnFailure(_built);
    }
    tableKey = hierarchyTableKey(_spec, _config.HIERARCHY_TABLE_KEYS);
    pending = _deps.readPendingLoad([{ tableName: tableKey }]);
    if (!(pending && typeof pending.then === "function")) {
      return returnFailure(_built);
    }
    handle = _openBlankWindow("about:blank");
    if (handle == null) {
      return returnBlocked(_built);
    }
    _slot.handle = handle;
    try {
      _writeDrillthroughWaitDocument.writeDrillthroughWaitDocument(handle, _deps.labels);
    } catch (err) {
      console.error("[drillthrough.openDrillthrough]", err);
      closeIfOpen(handle);
      return returnInternal(err);
    }
    _finishDeferredDrillthroughOpen({
      handle: handle,
      spec: _spec,
      deps: _deps,
      pending: pending,
      tableKey: tableKey,
      labels: _deps.labels
    });
    return returnPending(_spec);
  }

  function __controller(_spec, _deps) {
    var built;
    var handle;
    var slot = { handle: null };
    try {
      built = _buildDrillthroughUrl(_spec, _deps);
      if (built && built.ok === true) {
        logBuilt(built);
        handle = _openBlankWindow(built.url);
        if (handle == null) {
          return returnBlocked(built);
        }
        return withOpenOperation(built, true, null, null, null);
      }
      return openPendingOrFail(_spec, _deps, built, slot);
    } catch (err) {
      console.error("[drillthrough.openDrillthrough]", err);
      closeIfOpen(slot.handle);
      return returnInternal(err);
    }
  }

  return __controller;
});
