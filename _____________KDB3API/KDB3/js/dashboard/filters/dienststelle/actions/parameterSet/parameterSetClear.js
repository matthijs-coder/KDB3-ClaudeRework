define([
  "../../config/parameterSetCodes.js",
  "../../effects/clearDienststelleHostFilter.js"
], function (_codes, _clearHostFilter) {
  "use strict";

  function parameterSetClear(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _ctx.guardRun(payload);
    var diagnostics = [];
    if (guard) {
      return Promise.resolve(guard);
    }
    return Promise.resolve(_clearHostFilter(_ctx._KDB, _ctx.readActiveFilterKey(), payload)).then(function (clearResult) {
      // Stale recheck after the async clear (review D5), consistent with the
      // runId discipline in parameterSetRestore.js: never reconcile for a
      // superseded run.
      if (_ctx.isStale(payload.runId)) {
        diagnostics.push({
          code: _codes.CANCELLED,
          message: "stale parameterSet runId was superseded after clear"
        });
        return { ok: false, diagnostics: diagnostics };
      }
      if (!clearResult || clearResult.ok !== true) {
        diagnostics.push({
          code: _codes.FILTER_CLEAR_FAILED,
          message: "dienststelle clear failed for one or more scopes",
          details: clearResult || null
        });
      }
      return Promise.resolve(_ctx.reconcile({
        activeSichtValue: _ctx.readActiveSichtValue(),
        source: "tableData"
      })).then(function () {
        if (payload.status === "newDashboard" && diagnostics.length > 0) {
          return Promise.resolve(_ctx.reconcile({
            activeSichtValue: _ctx.readActiveSichtValue(),
            source: "sync"
          })).then(function () {
            return { ok: true, degraded: true, diagnostics: diagnostics };
          });
        }
        if (payload.status === "newDashboard") {
          return { ok: true, diagnostics: diagnostics };
        }
        return { ok: diagnostics.length === 0, diagnostics: diagnostics };
      });
    }).catch(function (error) {
      return {
        ok: payload.status === "newDashboard",
        degraded: payload.status === "newDashboard",
        diagnostics: [{
          code: _codes.FILTER_CLEAR_FAILED,
          message: "dienststelle clear threw: " + String(error && error.message ? error.message : error)
        }]
      };
    });
  }

  return parameterSetClear;
});
