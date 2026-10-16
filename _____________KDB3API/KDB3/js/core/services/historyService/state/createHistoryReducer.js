define([
  "./initialState.js",
  "./cloneSerializable.js",
], function (_initialState, _cloneSerializable) {
  "use strict";

  function __controller(_state, _action) {
    const action = _action || {};
    const state = normalizeState(_state);
    if (action.type === "history/initialize") {
      return writeLifecycle(state, "ready");
    }
    if (action.type === "history/commitStep") {
      return commitStep(state, action.payload);
    }
    if (action.type === "history/undoSucceeded") {
      return movePointer(state, -1, action.payload);
    }
    if (action.type === "history/redoSucceeded") {
      return movePointer(state, 1, action.payload);
    }
    if (action.type === "history/writebackBaselineApplied") {
      return applyWritebackBaseline(state, action.payload);
    }
    if (action.type === "history/error") {
      return recordError(state, action.payload);
    }
    if (action.type === "history/destroy") {
      return destroyState(state);
    }
    return state;
  }

  function normalizeState(_state) {
    const defaults = _initialState();
    const source = _state && typeof _state === "object" ? _state : {};
    const stack = Array.isArray(source.stack) ? _cloneSerializable(source.stack) : defaults.stack;
    const limit = normalizeLimit(source.limit, defaults.limit);
    const pointer = normalizePointer(source.pointer, stack.length);
    return {
      lifecycle: normalizeLifecycle(source.lifecycle, defaults.lifecycle),
      stack: stack,
      pointer: pointer,
      limit: limit,
      pendingStep: null,
      lastChangedAt: source.lastChangedAt == null ? null : source.lastChangedAt,
      errorCode: source.errorCode == null ? null : String(source.errorCode),
      errorMessage: source.errorMessage == null ? null : String(source.errorMessage),
    };
  }

  function normalizeLimit(limit, defaultLimit) {
    return typeof limit === "number" && isFinite(limit) && limit > 0 ? limit : defaultLimit;
  }

  function normalizePointer(pointer, stackLength) {
    if (typeof pointer !== "number" || !isFinite(pointer)) {
      return stackLength > 0 ? stackLength - 1 : -1;
    }
    return Math.max(-1, Math.min(Math.floor(pointer), stackLength - 1));
  }

  function normalizeLifecycle(lifecycle, defaultLifecycle) {
    if (lifecycle === "ready" || lifecycle === "error" || lifecycle === "disposed") {
      return lifecycle;
    }
    return defaultLifecycle;
  }

  function writeLifecycle(state, lifecycle) {
    return copyState(state, {
      lifecycle: lifecycle,
      pendingStep: null,
    });
  }

  function commitStep(state, payload) {
    const step = payload && payload.step ? payload.step : payload;
    if (!step) {
      return state;
    }
    const nextStack = state.stack.slice(0, state.pointer + 1);
    nextStack.push(_cloneSerializable(step));
    while (nextStack.length > state.limit) {
      nextStack.shift();
    }
    return copyState(state, {
      lifecycle: "ready",
      stack: nextStack,
      pointer: nextStack.length - 1,
      pendingStep: null,
      lastChangedAt: readLastChangedAt(payload, state.lastChangedAt),
      errorCode: null,
      errorMessage: null,
    });
  }

  function movePointer(state, offset, payload) {
    const pointer = normalizePointer(state.pointer + offset, state.stack.length);
    return copyState(state, {
      lifecycle: "ready",
      pointer: pointer,
      pendingStep: null,
      lastChangedAt: readLastChangedAt(payload, state.lastChangedAt),
      errorCode: null,
      errorMessage: null,
    });
  }

  // Writeback restore baseline per historyService-writebackRestore-contractdelta.md:
  // the restored dashboard becomes the new zero point; the empty stack is the
  // baseline, so undo cannot reach pre-restore (or partial-restore) state.
  function applyWritebackBaseline(state, payload) {
    return copyState(state, {
      lifecycle: "ready",
      stack: [],
      pointer: -1,
      pendingStep: null,
      lastChangedAt: readLastChangedAt(payload, state.lastChangedAt),
      errorCode: null,
      errorMessage: null,
    });
  }

  function readLastChangedAt(payload, fallback) {
    const value = payload && payload.lastChangedAt;
    return typeof value === "number" && isFinite(value) ? value : fallback;
  }

  function recordError(state, payload) {
    const error = payload || {};
    return copyState(state, {
      lifecycle: "error",
      pendingStep: null,
      errorCode: error.errorCode == null ? "historyServiceError" : String(error.errorCode),
      errorMessage: error.errorMessage == null ? null : String(error.errorMessage),
    });
  }

  function destroyState(state) {
    return copyState(state, {
      lifecycle: "disposed",
      pendingStep: null,
      errorCode: null,
      errorMessage: null,
    });
  }

  function copyState(state, changes) {
    const copy = {
      lifecycle: state.lifecycle,
      stack: state.stack,
      pointer: state.pointer,
      limit: state.limit,
      pendingStep: null,
      lastChangedAt: state.lastChangedAt,
      errorCode: state.errorCode,
      errorMessage: state.errorMessage,
    };
    const keys = Object.keys(changes || {});
    for (let index = 0; index < keys.length; index += 1) {
      copy[keys[index]] = changes[keys[index]];
    }
    return copy;
  }

  return __controller;
});
