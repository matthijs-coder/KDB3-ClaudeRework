define(["./config.js", "./state/selectors.js"], function (_config, _selectors) {
  "use strict";
  // footer/parameterSetRestoreRequested: maps the v3 foot {on} onto footer/show|hide through the normal commit path
  // (header guard, mount-target wait, DOM sync and history suppression included). Restore is absolute: omitted foot
  // (or status "newDashboard") applies the owner default (hidden footer). foot.on: 1 never forces the header active.

  function applyRestoreAction(_applyAction, _request, _type) {
    _applyAction({
      type: _type,
      payload: { source: "writebackSet" },
      options: { skipHistory: _request.skipHistory === true }
    });
  }

  function restoreActiveFooter(_KDB, _applyAction, _request, _diagnostics) {
    var headerStatus = typeof _request.headerStatus === "string" ? _request.headerStatus : _selectors.readHeaderStatus(_KDB);
    if (headerStatus !== "active") {
      applyRestoreAction(_applyAction, _request, "footer/hide");
      _diagnostics.push({
        code: _config.ERROR_CODES.headerGuard,
        message: "foot.on: 1 requires an active header (headerStatus: " + String(headerStatus) + "); footer left inactive"
      });
      return;
    }
    applyRestoreAction(_applyAction, _request, "footer/show");
    // The live commit-path guard re-checks header state; report it honestly if it refused the activation.
    if (_selectors.readFooterStatus(_KDB) !== "active") {
      _diagnostics.push({ code: _config.ERROR_CODES.headerGuard, message: "footer activation was refused by the live header guard" });
    }
  }

  function buildResult(_KDB, _ok, _diagnostics) {
    return Promise.resolve({ ok: _ok, status: _selectors.readFooterStatus(_KDB), diagnostics: _diagnostics });
  }

  function restoreFooterParameterSet(_KDB, _applyAction, _action) {
    var request = (_action && _action.payload) || {};
    var codes = _config.ERROR_CODES;
    if (typeof request.runId !== "number") {
      return buildResult(_KDB, false, [
        { code: codes.restoreCancelled, message: "footer/parameterSetRestoreRequested requires a numeric runId" }
      ]);
    }
    var rt = _KDB.runtime.footer;
    if (typeof rt.parameterSetRunId === "number" && request.runId < rt.parameterSetRunId) {
      return buildResult(_KDB, false, [
        { code: codes.restoreCancelled, message: "stale parameterSet runId " + request.runId + " superseded by " + rt.parameterSetRunId }
      ]);
    }
    rt.parameterSetRunId = request.runId;

    var foot = request.status === "newDashboard" ? undefined : request.footer;
    var diagnostics = [];
    try {
      if (foot && foot.on === 1) restoreActiveFooter(_KDB, _applyAction, request, diagnostics);
      else applyRestoreAction(_applyAction, request, "footer/hide");
    } catch (err) {
      diagnostics.push({ code: codes.restoreFailed, message: "footer restore apply threw: " + String(err && err.message ? err.message : err) });
    }
    return buildResult(_KDB, diagnostics.length === 0, diagnostics);
  }

  return { restoreFooterParameterSet: restoreFooterParameterSet };
});
