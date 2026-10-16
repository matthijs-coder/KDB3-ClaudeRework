define([
  "./readWritebackGetPersistPopup.js",
  "./effects/applyWritebackGetPersistLoading.js"
], function (_readWritebackGetPersistPopup, _persistLoading) {
  "use strict";

  const POLL_MS = 200;
  const STUCK_CAP_MS = 30000;

  function scheduleWritebackGetPersistRestore(_KDB, _capturedIndex, _generation, _runRestore) {
    try {
      const runtime = readWritebackRuntime(_KDB);
      if (!runtime) { return; }
      _persistLoading.armCancelWatch(_KDB);
      runtime.timers.persistRestoreTab = setTimeout(
        tickPersistRestoreWatch.bind(null, _KDB, _capturedIndex, _generation, _runRestore, Date.now(), false),
        POLL_MS
      );
    } catch (error) {
      console.warn("[writebackGet.persistLanding] restore watch schedule failed", error);
    }
  }

  function tickPersistRestoreWatch(_KDB, _capturedIndex, _generation, _runRestore, _startedAt, _didSeePopup) {
    try {
      const runtime = readWritebackRuntime(_KDB);
      if (!runtime || runtime.persistRestoreGeneration !== _generation) { return; }
      if (runtime.parameterSetRestoreActive) {
        runPersistRestoreThenFinish(_KDB, _capturedIndex, _generation, _runRestore);
        return;
      }
      const popup = _readWritebackGetPersistPopup();
      const didSeePopup = _didSeePopup || !!popup;
      const elapsed = Date.now() - _startedAt;
      if (didSeePopup && !popup) {
        runPersistRestoreThenFinish(_KDB, _capturedIndex, _generation, _runRestore);
        return;
      }
      if (elapsed >= STUCK_CAP_MS) {
        console.warn("[writebackGet.persistLanding] persist popup stuck cap", { elapsedMs: elapsed, didSeePopup: didSeePopup });
        runPersistRestoreThenFinish(_KDB, _capturedIndex, _generation, _runRestore);
        return;
      }
      runtime.timers.persistRestoreTab = setTimeout(
        tickPersistRestoreWatch.bind(null, _KDB, _capturedIndex, _generation, _runRestore, _startedAt, didSeePopup),
        POLL_MS
      );
    } catch (error) {
      console.warn("[writebackGet.persistLanding] restore watch tick failed", error);
    }
  }

  function runPersistRestoreThenFinish(_KDB, _capturedIndex, _generation, _runRestore) {
    try {
      _runRestore(_KDB, _capturedIndex, _generation);
    } catch (error) {
      console.warn("[writebackGet.persistLoading] restore dispatch failed", error);
    } finally {
      _persistLoading.finish(_KDB);
    }
  }

  function readWritebackRuntime(_KDB) {
    try {
      if (!_KDB) { return null; }
      _KDB.runtime = _KDB.runtime || {};
      if (!_KDB.runtime.writeback || typeof _KDB.runtime.writeback !== "object") { _KDB.runtime.writeback = {}; }
      const runtime = _KDB.runtime.writeback;
      if (!runtime.timers || typeof runtime.timers !== "object") { runtime.timers = {}; }
      return runtime;
    } catch (error) {
      console.warn("[writebackGet.persistLanding] restore runtime missing", error);
      return null;
    }
  }

  return scheduleWritebackGetPersistRestore;
});
