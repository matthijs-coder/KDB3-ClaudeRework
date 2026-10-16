define([
  "./guardTabMutation.js",
  "./applyTabMutationScopeOps.js",
  "./applyTabMutationDelete.js",
  "./applyTabMutationMove.js",
  "./applyTabMutationDuplicate.js",
  "./applyTabMutationRestoreDeleted.js"
], function (_support, _scopeOps, _applyDelete, _applyMove, _applyDuplicate, _applyRestoreDeleted) {
  "use strict";

  async function applyTabMutation(_ctx, _payload) {
    var payload = _payload || {};
    try {
      var guard = _support.guardRun(_ctx.runtime, payload);
      if (guard) { return _scopeOps.failed(payload.operationId, [], [], guard.diagnostics); }
      if (!payload.plan || (payload.plan.operation !== "delete" && payload.plan.operation !== "move" && payload.plan.operation !== "duplicate" && payload.plan.operation !== "restoreDeleted")) {
        return _scopeOps.failed(payload.operationId, [], [], [{ code: "TABS_MUTATION_APPLY_FAILED", message: "NativeMultiSelect apply supports delete, move, duplicate, and restoreDeleted" }]);
      }
      if (payload.plan.operation === "delete") { return _applyDelete(_ctx, payload); }
      if (payload.plan.operation === "duplicate") { return _applyDuplicate(_ctx, payload); }
      if (payload.plan.operation === "restoreDeleted") { return _applyRestoreDeleted(_ctx, payload); }
      return _applyMove(_ctx, payload);
    } catch (error) {
      console.error("[nativeMultiSelect.applyTabMutation] failed", error);
      return _scopeOps.failed(payload.operationId, [], [], [{ code: "TABS_MUTATION_APPLY_FAILED", message: String(error && error.message ? error.message : error) }]);
    }
  }

  return applyTabMutation;
});
