/*
 * historyService registration and public service object.
 * Lifecycle: ready, error, disposed. State lives in `_KDB.state.history`; `_KDB.runtime.history` holds the
 * standard buckets plus `adapters`, `writebackRestore` and `replay` (both read by other
 * modules, so begin/finish replace the writebackRestore object and keep its field names).
 * Replay handlers: owners (or the bootstrap on their behalf) call `registerReplayHandler(key, handler)`.
 */
define([
  "../../utils/kit/data.js",
  "../../utils/kit/errors.js",
  "../../utils/kit/runtime.js",
  "./state.js",
  "./replay.js",
], function (_data, _errors, _runtime, _state, _replay) {
  "use strict";

  function registerHistoryService(_KDB, _options) {
    const options = _options || {};
    _KDB.services = _KDB.services || {};
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.state.history = _state.normalizeHistoryState(_KDB.state.history);
    _KDB.runtime.history = normalizeHistoryRuntime(_KDB.runtime.history);
    if (!_KDB.services.history) {
      _KDB.services.history = createHistoryService(_KDB, options);
    }
    return _KDB.services.history;
  }

  function normalizeHistoryRuntime(historyRuntime) {
    const source = historyRuntime && typeof historyRuntime === "object" ? historyRuntime : {};
    return _runtime.ensureRuntimeBuckets({
      subscriptions: source.subscriptions,
      listeners: source.listeners,
      abortControllers: source.abortControllers,
      timers: source.timers,
      pendingPromises: source.pendingPromises,
      adapters: source.adapters || {},
      writebackRestore: normalizeWritebackRestoreFlag(source.writebackRestore),
      replay: normalizeReplayFlag(source.replay),
    });
  }

  function normalizeReplayFlag(flag) {
    const source = flag && typeof flag === "object" ? flag : {};
    return { active: source.active === true, direction: source.direction == null ? null : source.direction };
  }

  function normalizeWritebackRestoreFlag(flag) {
    const source = flag && typeof flag === "object" ? flag : {};
    return {
      active: source.active === true,
      runId: typeof source.runId === "number" ? source.runId : null,
      source: source.source == null ? null : source.source,
      status: source.status == null ? null : source.status,
      lastFinish: source.lastFinish == null ? null : source.lastFinish,
    };
  }

  function createHistoryService(_KDB, options) {
    const guard = _errors.createDisposedGuard("historyService");
    const initial = options.replayHandlers;
    const replayHandlers = initial && typeof initial === "object" ? Object.assign({}, initial) : {};


    function dispatch(action) {
      _KDB.state.history = _state.reduceHistory(_KDB.state.history, action);
    }

    function recordError(methodName, error) {
      console.error("[historyService." + methodName + "] public method failed", error);
      dispatch({
        type: "history/error",
        payload: { errorCode: "historyServicePublicMethodFailed", errorMessage: error && error.message },
      });
    }

    function emitChanged() {
      _replay.emitHistoryChanged(_KDB);
    }

    const replayContext = {
      _KDB: _KDB,
      guard: guard,
      dispatch: dispatch,
      recordError: recordError,
      replayHandlers: function () { return replayHandlers; },
    };

    // Public-method boundary: failures are logged once, recorded as error state and mapped to `fallback`.
    function boundary(methodName, fallback, run) {
      try {
        return run();
      } catch (error) {
        recordError(methodName, error);
        return fallback(error);
      }
    }

    function rejectDisposed() {
      return Promise.reject(new Error("historyService disposed"));
    }

    function readState() {
      return _replay.readHistoryState(_KDB);
    }

    dispatch({ type: "history/initialize" });
    emitChanged();

    function pushCommittedStep(rawStep) {
      if (guard.blocked("pushCommittedStep")) {
        return false;
      }
      return boundary("pushCommittedStep", function () { return false; }, function () {
        // Internal restore steps must not become undo entries, even when an owner forgets skipHistory.
        if (_replay.readWritebackRestoreFlag(_KDB).active) {
          return false;
        }
        const step = _state.normalizeHistoryStep(rawStep);
        if (!step || _state.areSameJson(step.old, step.new)) {
          return false;
        }
        dispatch({ type: "history/commitStep", payload: { step: step, lastChangedAt: Date.now() } });
        emitChanged();
        return true;
      });
    }

    function beginWritebackRestore(rawOptions) {
      if (guard.blocked("beginWritebackRestore")) {
        return false;
      }
      return boundary("beginWritebackRestore", function () { return false; }, function () {
        const opts = rawOptions || {};
        if (typeof opts.runId !== "number") {
          console.warn("[historyService.beginWritebackRestore] rejected: numeric runId is required");
          return false;
        }
        const flag = _replay.readWritebackRestoreFlag(_KDB);
        if (flag.active) {
          console.warn("[historyService.beginWritebackRestore] rejected: restore already active", {
            activeRunId: flag.runId,
            requestedRunId: opts.runId,
          });
          return false;
        }
        writeWritebackRestoreFlag({ active: true, runId: opts.runId, source: opts.source || null, status: opts.status || null });
        emitChanged();
        return true;
      });
    }

    // The restored state becomes the new zero point for every outcome: undoing into pre-restore steps
    // would replay onto an indeterminate dashboard.
    function finishWritebackRestore(rawOptions) {
      if (guard.blocked("finishWritebackRestore")) {
        return false;
      }
      return boundary("finishWritebackRestore", function () { return false; }, function () {
        const opts = rawOptions || {};
        const flag = _replay.readWritebackRestoreFlag(_KDB);
        if (!flag.active || flag.runId !== opts.runId) {
          console.warn("[historyService.finishWritebackRestore] ignored: runId does not match active restore", {
            activeRunId: flag.active ? flag.runId : null,
            requestedRunId: opts.runId,
          });
          return false;
        }
        dispatch({ type: "history/writebackBaselineApplied", payload: { lastChangedAt: Date.now() } });
        writeWritebackRestoreFlag({
          active: false,
          runId: null,
          source: null,
          status: null,
          lastFinish: { runId: opts.runId, outcome: opts.outcome || null, baseline: opts.baseline || null, finishedAt: Date.now() },
        });
        emitChanged();
        return true;
      });
    }

    function writeWritebackRestoreFlag(flag) {
      _KDB.runtime.history = _KDB.runtime.history || {};
      _KDB.runtime.history.writebackRestore = flag;
    }

    function noopUnregister() {}

    // The latest registration for a key wins; the returned function removes it only while it is still current.
    function registerReplayHandler(key, handler) {
      if (guard.blocked("registerReplayHandler")) {
        return noopUnregister;
      }
      if (typeof key !== "string" || !key || !handler || typeof handler.apply !== "function") {
        console.warn("[historyService.registerReplayHandler] rejected: a string key and a handler with apply() are required", key);
        return noopUnregister;
      }
      if (replayHandlers[key] && replayHandlers[key] !== handler) {
        console.warn("[historyService.registerReplayHandler] replacing the handler already registered for", key);
      }
      replayHandlers[key] = handler;
      return function unregisterReplayHandler() {
        if (replayHandlers[key] === handler) {
          delete replayHandlers[key];
        }
      };
    }

    function canUndo() {
      if (guard.isDisposed()) {
        return false;
      }
      return boundary("canUndo", function () { return false; }, function () {
        const state = readState();
        return !_replay.isHistoryLocked(_KDB) && !!state && state.pointer >= 0;
      });
    }

    function canRedo() {
      if (guard.isDisposed()) {
        return false;
      }
      return boundary("canRedo", function () { return false; }, function () {
        const state = readState();
        return !_replay.isHistoryLocked(_KDB) && !!state && state.pointer < state.stack.length - 1;
      });
    }

    function undo() {
      if (guard.isDisposed()) {
        return rejectDisposed();
      }
      return boundary("undo", function (error) { return Promise.reject(error); }, function () {
        if (!canUndo()) {
          return Promise.resolve(false);
        }
        const state = readState();
        return _replay.runReplay(replayContext, "undo", state.stack[state.pointer]);
      });
    }

    function redo() {
      if (guard.isDisposed()) {
        return rejectDisposed();
      }
      return boundary("redo", function (error) { return Promise.reject(error); }, function () {
        if (!canRedo()) {
          return Promise.resolve(false);
        }
        const state = readState();
        return _replay.runReplay(replayContext, "redo", state.stack[state.pointer + 1]);
      });
    }

    function getSnapshot() {
      if (guard.isDisposed()) {
        return undefined;
      }
      return boundary("getSnapshot", function () { return undefined; }, function () {
        const state = readState();
        return state ? _data.cloneJson({ stack: state.stack, pointer: state.pointer, limit: state.limit }) : undefined;
      });
    }

    function isWritebackRestoreActive() {
      if (guard.isDisposed()) {
        return undefined;
      }
      return _replay.readWritebackRestoreFlag(_KDB).active === true;
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      try {
        guard.dispose();
        Object.keys(replayHandlers).forEach(function (key) { delete replayHandlers[key]; });
        dispatch({ type: "history/destroy" });
        disposeRuntime(_KDB.runtime.history);
      } catch (error) {
        console.error("[historyService.destroy] public method failed", error);
      }
    }

    return {
      pushCommittedStep: pushCommittedStep,
      undo: undo,
      redo: redo,
      canUndo: canUndo,
      canRedo: canRedo,
      getSnapshot: getSnapshot,
      beginWritebackRestore: beginWritebackRestore,
      finishWritebackRestore: finishWritebackRestore,
      isWritebackRestoreActive: isWritebackRestoreActive,
      registerReplayHandler: registerReplayHandler,
      destroy: destroy,
    };
  }

  function disposeRuntime(runtime) {
    _runtime.disposeRuntimeBuckets(runtime).forEach(function (error) {
      console.error("[historyService.destroy] runtime teardown failed", error);
    });
    runtime.adapters = {};
    runtime.writebackRestore = normalizeWritebackRestoreFlag(null);
    runtime.replay = normalizeReplayFlag(null);
  }

  return registerHistoryService;
});
