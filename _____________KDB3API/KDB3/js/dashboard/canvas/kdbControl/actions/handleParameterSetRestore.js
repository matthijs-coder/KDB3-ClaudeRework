define(["./buildParameterSetRestoreActions"], function (_buildRestoreActions) {
  "use strict";

  var RESTORE_FAILED = "WRITEBACK_KDBCONTROL_RESTORE_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";

  // kdbControl/parameterSetRestoreRequested per
  // contracts/kdbControl-parameterSetRestore-contractdelta.md. Applies the
  // desired canv/sett end state (owner defaults + payload overlay; defaults
  // only for status "newDashboard") through the normal settings action path,
  // so canvas intents, panel visuals and history suppression reuse the
  // existing owner flows. Ends with one configuration UI sync.
  function handleParameterSetRestore(_KDB, _deps, _action) {
    var payload = (_action && _action.payload) || {};
    if (typeof payload.runId !== "number") {
      return resultPromise(false, [], [], [{ code: CANCELLED, message: "kdbControl/parameterSetRestoreRequested requires a numeric runId" }]);
    }
    var runtime = _KDB.runtime && _KDB.runtime.kdbControl;
    var state = _KDB.state && _KDB.state.kdbControl;
    if (!runtime || !state || !state.settings) {
      return resultPromise(false, [], [], [{ code: RESTORE_FAILED, message: "kdbControl is not mounted; cannot restore canv/sett" }]);
    }
    if (typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId) {
      return resultPromise(false, [], [], [{ code: CANCELLED, message: "stale parameterSet runId " + payload.runId + " superseded by " + runtime.parameterSetRunId }]);
    }
    runtime.parameterSetRunId = payload.runId;

    var plan = _buildRestoreActions(state.settings, payload);
    var appliedKeys = [];
    var diagnostics = [];
    plan.actions.forEach(function (entry) {
      entry.action.commitOptions = { skipHistory: payload.skipHistory === true, forceApply: true };
      if (_deps.applySettingsAction(entry.action) === true) {
        appliedKeys.push(entry.key);
      } else {
        diagnostics.push({ code: RESTORE_FAILED, key: entry.key, message: "settings apply was rejected for " + entry.key });
      }
    });
    _deps.syncView();
    return resultPromise(diagnostics.length === 0, appliedKeys, plan.skippedKeys, diagnostics);
  }

  function resultPromise(ok, appliedKeys, skippedKeys, diagnostics) {
    return Promise.resolve({ ok: ok, appliedKeys: appliedKeys, skippedKeys: skippedKeys, diagnostics: diagnostics });
  }

  return handleParameterSetRestore;
});
