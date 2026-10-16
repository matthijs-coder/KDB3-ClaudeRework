define(["../state/selectors"], function (_selectors) {
  "use strict";

  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var HEADER_GUARD = "WRITEBACK_FOOTER_HEADER_GUARD";
  var RESTORE_FAILED = "WRITEBACK_FOOTER_RESTORE_FAILED";

  // footer/parameterSetRestoreRequested per
  // contracts/footer-parameterSetRestore-contractdelta.md. Maps v3 foot {on}
  // onto footer/show|hide through the normal owner commit path (header guard,
  // mount-target wait, DOM sync, history suppression included). Restore is
  // absolute: omitted foot (or status "newDashboard") applies the owner
  // default (hidden footer). foot.on: 1 never forces the header active.
  function handleParameterSetRestore(_KDB, _deps, _action) {
    var p = (_action && _action.payload) || {};
    var diagnostics = [];
    if (typeof p.runId !== "number") {
      return result(_KDB, false, [{ code: CANCELLED, message: "footer/parameterSetRestoreRequested requires a numeric runId" }]);
    }
    var runtime = _KDB.runtime.footer;
    if (typeof runtime.parameterSetRunId === "number" && p.runId < runtime.parameterSetRunId) {
      return result(_KDB, false, [{ code: CANCELLED, message: "stale parameterSet runId " + p.runId + " superseded by " + runtime.parameterSetRunId }]);
    }
    runtime.parameterSetRunId = p.runId;

    var foot = p.status === "newDashboard" ? undefined : p.footer;
    try {
      if (foot && foot.on === 1) {
        restoreActive(_KDB, _deps, p, diagnostics);
      } else {
        applyAction(_deps, p, "footer/hide");
      }
    } catch (err) {
      diagnostics.push({ code: RESTORE_FAILED, message: "footer restore apply threw: " + String(err && err.message ? err.message : err) });
    }
    return result(_KDB, diagnostics.length === 0, diagnostics);
  }

  function restoreActive(_KDB, _deps, p, diagnostics) {
    var headerStatus = typeof p.headerStatus === "string" ? p.headerStatus : _selectors.readHeaderStatus(_KDB);
    if (headerStatus !== "active") {
      applyAction(_deps, p, "footer/hide");
      diagnostics.push({ code: HEADER_GUARD, message: "foot.on: 1 requires an active header (headerStatus: " + String(headerStatus) + "); footer left inactive" });
      return;
    }
    applyAction(_deps, p, "footer/show");
    // The live commit-path guard re-checks header state; if it refused the
    // activation despite the payload headerStatus, report the guard honestly.
    if (_selectors.readFooterStatus(_KDB) !== "active") {
      diagnostics.push({ code: HEADER_GUARD, message: "footer activation was refused by the live header guard" });
    }
  }

  function applyAction(_deps, p, type) {
    _deps.applyAction({
      type: type,
      payload: { source: "writebackSet" },
      options: { skipHistory: p.skipHistory === true },
    });
  }

  function result(_KDB, ok, diagnostics) {
    return Promise.resolve({ ok: ok, status: _selectors.readFooterStatus(_KDB), diagnostics: diagnostics });
  }

  return handleParameterSetRestore;
});
