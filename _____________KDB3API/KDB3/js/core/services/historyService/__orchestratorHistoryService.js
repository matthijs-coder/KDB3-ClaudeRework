define([
  "./config/defaults.js",
  "./state/initialState.js",
  "./createHistoryService.js",
], function (_defaults, _initialState, _createHistoryService) {
  "use strict";

  // Lifecycle terms for historyService:
  //   ready, error, disposed.
  function __orchestrator(_KDB, _options) {
    const options = _options || {};
    try {
      _KDB.services = _KDB.services || {};
      _KDB.state = _KDB.state || {};
      _KDB.runtime = _KDB.runtime || {};
      _KDB.state.history = normalizeHistoryState(_KDB.state.history);
      _KDB.runtime.history = normalizeHistoryRuntime(_KDB.runtime.history);
      if (options.bindReplayHandlersOnly === true) {
        const adapter = _KDB.runtime.history.adapters && _KDB.runtime.history.adapters.bindReplayHandlers;
        if (typeof adapter === "function") {
          adapter(options.replayHandlers || {});
          return _KDB.services.history || null;
        }
        console.warn("[historyService.__orchestrator] bindReplayHandlersOnly requested but adapter or service is absent");
        return _KDB.services.history || null;
      }
      if (!_KDB.services.history) {
        _KDB.services.history = _createHistoryService({ _KDB: _KDB, defaults: _defaults, options: options });
      }
      return _KDB.services.history;
    } catch (error) {
      console.error("[historyService.__orchestrator] service startup failed", error);
      throw error;
    }
  }

  function normalizeHistoryState(historyState) {
    const state = historyState && typeof historyState === "object" ? historyState : _initialState();
    const defaults = _initialState();
    return {
      lifecycle: state.lifecycle || defaults.lifecycle,
      stack: Array.isArray(state.stack) ? state.stack : defaults.stack,
      pointer: typeof state.pointer === "number" ? state.pointer : defaults.pointer,
      limit: typeof state.limit === "number" && state.limit > 0 ? state.limit : defaults.limit,
      pendingStep: null,
      lastChangedAt: state.lastChangedAt == null ? null : state.lastChangedAt,
      errorCode: state.errorCode == null ? null : String(state.errorCode),
      errorMessage: state.errorMessage == null ? null : String(state.errorMessage),
    };
  }

  function normalizeHistoryRuntime(historyRuntime) {
    const runtime = historyRuntime && typeof historyRuntime === "object" ? historyRuntime : {};
    return {
      subscriptions: runtime.subscriptions || {},
      listeners: runtime.listeners || {},
      abortControllers: runtime.abortControllers || {},
      timers: runtime.timers || {},
      pendingPromises: runtime.pendingPromises || {},
      adapters: runtime.adapters || {},
      writebackRestore: normalizeWritebackRestoreFlag(runtime.writebackRestore),
      replay: normalizeReplayFlag(runtime.replay),
    };
  }

  // Replay-lock (remediation B5): één undo/redo-replay tegelijk.
  function normalizeReplayFlag(flag) {
    const source = flag && typeof flag === "object" ? flag : {};
    return {
      active: source.active === true,
      direction: source.direction == null ? null : source.direction,
    };
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

  return __orchestrator;
});
