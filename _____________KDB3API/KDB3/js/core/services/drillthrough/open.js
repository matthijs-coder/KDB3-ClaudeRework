define([
  "./buildDrillthroughUrl.js",
  "./config.js"
], function (_build, _config) {
  "use strict";

  var buildDrillthroughUrl = _build.buildDrillthroughUrl;
  var createBuildResult = _build.createBuildResult;
  var WAIT_DOCUMENT_HTML = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title></title></head><body><p></p></body></html>";

  function labelText(_labels, _key) {
    var value = _labels && _labels[_key];
    return typeof value === "string" ? value : "";
  }

  // The "noopener" window feature makes window.open return null, which would read as a blocked popup and
  // leave no handle for the wait window. Dropping the opener reference right after opening isolates the same way.
  function detachOpener(_handle) {
    try {
      if (_handle) {
        _handle.opener = null;
      }
    } catch (err) {
      console.error("[drillthrough.openBlankWindow] detaching the opener failed", err);
    }
  }

  function openBlankWindow(_url) {
    var handle = window.open(_url, "_blank");
    detachOpener(handle);
    return handle;
  }

  function closeIfOpen(_handle) {
    try {
      if (_handle && _handle.closed !== true) {
        _handle.close();
      }
    } catch (err) {
      console.error("[drillthrough.openDrillthrough] closing the popup failed", err);
    }
  }

  function writeWaitDocument(_handle, _labels) {
    var doc = _handle.document;
    doc.open();
    doc.write(WAIT_DOCUMENT_HTML);
    doc.close();
    doc.title = labelText(_labels, "waitWindowTitle");
    doc.body.firstChild.textContent = labelText(_labels, "waitWindowBody");
  }

  function replaceWaitBody(_handle, _labels, _body) {
    var doc = _handle.document;
    doc.title = labelText(_labels, "waitWindowTitle");
    doc.body.textContent = typeof _body === "string" ? _body : "";
  }

  function isHandleClosed(_ctx) {
    return !_ctx || !_ctx.handle || _ctx.handle.closed === true;
  }

  function writeBody(_ctx, _key) {
    if (!isHandleClosed(_ctx)) {
      replaceWaitBody(_ctx.handle, _ctx.labels, labelText(_ctx.labels, _key));
    }
  }

  function navigateReady(_ctx, _url) {
    try {
      if (!isHandleClosed(_ctx)) {
        _ctx.handle.location.replace(_url);
      }
    } catch (error) {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", error);
      writeBody(_ctx, "loadFailedBody");
    }
  }

  function onDeferredFulfilled(_ctx) {
    var record;
    var built;
    try {
      if (isHandleClosed(_ctx)) {
        return;
      }
      record = _ctx.deps.readTableState([{ tableName: _ctx.tableKey }]);
      if (!record || record.lifecycle !== "ready") {
        closeIfOpen(_ctx.handle);
        return;
      }
      built = buildDrillthroughUrl(_ctx.spec, _ctx.deps);
      if (built && built.ok === true) {
        navigateReady(_ctx, built.url);
        return;
      }
      writeBody(_ctx, built && built.errorCode === "DRILLTHROUGH_ORG_TREE_MISSING" ? "treeMissingBody" : "loadFailedBody");
    } catch (error) {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", error);
    }
  }

  function onDeferredRejected(_ctx, _error) {
    try {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", _error);
      writeBody(_ctx, "loadFailedBody");
    } catch (error) {
      console.error("[drillthrough.finishDeferredDrillthroughOpen]", error);
    }
  }

  function finishDeferredDrillthroughOpen(_ctx) {
    _ctx.pending.then(onDeferredFulfilled.bind(null, _ctx), onDeferredRejected.bind(null, _ctx));
  }

  function openResult(_built, _ok, _code, _message, _stage) {
    var diag = _built && _built.diagnostics ? _built.diagnostics : {};
    return createBuildResult({
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

  function failureResult(_built) {
    var diag = _built && _built.diagnostics ? _built.diagnostics : {};
    return openResult(_built, false, _built && _built.errorCode, _built && _built.errorMessage, diag.failedStage);
  }

  function blockedResult(_built) {
    return openResult(_built, false, "DRILLTHROUGH_OPEN_BLOCKED", "window.open returned null", "openWindow");
  }

  function internalResult(_err) {
    return createBuildResult({
      ok: false,
      errorCode: "DRILLTHROUGH_OPEN_INTERNAL",
      errorMessage: _err && _err.message ? String(_err.message) : "open failed",
      diagnostics: { operation: "openDrillthrough", failedStage: "openWindow", warnings: [] }
    });
  }

  function pendingResult(_spec) {
    return createBuildResult({
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

  function hierarchyTableKey(_spec) {
    var keys = _config.HIERARCHY_TABLE_KEYS;
    return String(_spec && _spec.sicht || "").toUpperCase().trim() === "DEZPV" ? keys.DEZPV : keys.BW;
  }

  function openPendingOrFail(_spec, _deps, _built, _slot) {
    var tableKey;
    var pending;
    var handle;
    if (!_built || _built.errorCode !== "DRILLTHROUGH_ORG_TREE_MISSING" || !_deps || typeof _deps.readPendingLoad !== "function") {
      return failureResult(_built);
    }
    tableKey = hierarchyTableKey(_spec);
    pending = _deps.readPendingLoad([{ tableName: tableKey }]);
    if (!(pending && typeof pending.then === "function")) {
      return failureResult(_built);
    }
    handle = openBlankWindow("about:blank");
    if (handle == null) {
      return blockedResult(_built);
    }
    _slot.handle = handle;
    try {
      writeWaitDocument(handle, _deps.labels);
    } catch (err) {
      console.error("[drillthrough.openDrillthrough] wait document failed", err);
      closeIfOpen(handle);
      return internalResult(err);
    }
    finishDeferredDrillthroughOpen({
      handle: handle,
      spec: _spec,
      deps: _deps,
      pending: pending,
      tableKey: tableKey,
      labels: _deps.labels
    });
    return pendingResult(_spec);
  }

  function openDrillthrough(_spec, _deps) {
    var built;
    var slot = { handle: null };
    try {
      built = buildDrillthroughUrl(_spec, _deps);
      if (built && built.ok === true) {
        if (openBlankWindow(built.url) == null) {
          return blockedResult(built);
        }
        return openResult(built, true, null, null, null);
      }
      return openPendingOrFail(_spec, _deps, built, slot);
    } catch (err) {
      console.error("[drillthrough.openDrillthrough]", err);
      closeIfOpen(slot.handle);
      return internalResult(err);
    }
  }

  return openDrillthrough;
});
