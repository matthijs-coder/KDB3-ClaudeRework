define([
  "../state/ensureWidgetBaseRuntime.js",
  "../../../../core/utils/kit/data.js"
], function (_runtime, _data) {
  "use strict";

  function guardRun(_KDB, _payload) {
    var payload = _payload || {};
    var runtime = ensureRuntime(_KDB);
    if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "widgetBase tab mutation requires numeric runId." }] };
    }
    if (typeof runtime.tabMutationRunId === "number" && payload.runId < runtime.tabMutationRunId) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "stale widgetBase tab mutation runId." }] };
    }
    runtime.tabMutationRunId = payload.runId;
    return null;
  }

  function isStale(_KDB, _runId) {
    var runtime = ensureRuntime(_KDB);
    return typeof runtime.tabMutationRunId === "number" && _runId < runtime.tabMutationRunId;
  }

  function snapshotFrames(_KDB, _plan, _operationId) {
    var runtime = ensureRuntime(_KDB);
    var base = _KDB.state && _KDB.state.widgets && _KDB.state.widgets.base || {};
    var byId = base.byId || {};
    var affected = {};
    Object.keys(byId).forEach(function (widgetId) {
      var frame = byId[widgetId];
      if (frame && _plan.affectedTabIds.indexOf(frame.tabId) >= 0) {
        affected[widgetId] = _data.cloneJson(frame);
      }
    });
    runtime.tabMutationSnapshots[_operationId] = {
      operationId: _operationId,
      plan: _data.cloneJson(_plan || null),
      physicalStarted: false,
      byId: affected
    };
    return runtime.tabMutationSnapshots[_operationId];
  }

  function readSnapshot(_KDB, _operationId) {
    return ensureRuntime(_KDB).tabMutationSnapshots[_operationId] || null;
  }

  function deleteSnapshot(_KDB, _operationId) {
    delete ensureRuntime(_KDB).tabMutationSnapshots[_operationId];
  }

  function ensureRuntime(_KDB) {
    _runtime.ensureWidgetBaseRuntime(_KDB);
    return _KDB.runtime.widgetBase;
  }

  return {
    guardRun: guardRun,
    isStale: isStale,
    snapshotFrames: snapshotFrames,
    readSnapshot: readSnapshot,
    deleteSnapshot: deleteSnapshot
  };
});
