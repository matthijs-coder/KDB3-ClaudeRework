define(["../config/mutationCodes.js"], function (_codes) {
  "use strict";

  function acquire(_ctx) {
    try {
      var runtime = ensureRuntime(_ctx._KDB);
      var pending = runtime.pendingPromises || {};
      if (pending.tabMutation || pending.traverse || pending.startup) {
        return conflict("A tabs operation is already in progress.");
      }
      runtime.tabMutationRunId = (runtime.tabMutationRunId || 0) + 1;
      return { ok: true, runId: runtime.tabMutationRunId };
    } catch (err) {
      console.error("[tabs.guardTabMutation.acquire] failed", err);
      return conflict("Failed to acquire tab mutation lock.");
    }
  }

  function register(_ctx, _promise) {
    try {
      var runtime = ensureRuntime(_ctx._KDB);
      runtime.pendingPromises.tabMutation = _promise;
    } catch (err) {
      console.error("[tabs.guardTabMutation.register] failed", err);
    }
  }

  // Idempotent; called both mid-saga (before the final emit) and from the
  // outer .finally() safety net — must never throw inside a .finally() (M6).
  function release(_ctx, _promise) {
    try {
      var runtime = ensureRuntime(_ctx._KDB);
      if (!_promise || runtime.pendingPromises.tabMutation === _promise) {
        delete runtime.pendingPromises.tabMutation;
      }
    } catch (err) {
      console.error("[tabs.guardTabMutation.release] failed", err);
    }
  }

  function isStale(_ctx, _runId) {
    try {
      var runtime = ensureRuntime(_ctx._KDB);
      return typeof runtime.tabMutationRunId === "number" && _runId < runtime.tabMutationRunId;
    } catch (err) {
      console.error("[tabs.guardTabMutation.isStale] failed", err);
      return false;
    }
  }

  function ensureRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.tabs = _KDB.runtime.tabs || {};
    _KDB.runtime.tabs.pendingPromises = _KDB.runtime.tabs.pendingPromises || {};
    return _KDB.runtime.tabs;
  }

  function conflict(message) {
    return { ok: false, errorCode: _codes.CONFLICT, diagnostics: [{ code: _codes.CONFLICT, message: message }] };
  }

  return Object.freeze({
    acquire: acquire,
    register: register,
    release: release,
    isStale: isStale
  });
});
