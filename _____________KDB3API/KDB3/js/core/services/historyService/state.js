/*
 * historyService state: initial state, reducer, step normalisation and JSON equality.
 * `_KDB.state.history` is treated as immutable: reducer actions build new objects and arrays and reuse
 * existing step objects by reference. Steps are cloned exactly once, in normalizeHistoryStep.
 */
define(["../../utils/kit/data.js"], function (_data) {
  "use strict";

  const DEFAULT_HISTORY_LIMIT = 5;
  const LIFECYCLES = ["ready", "error", "disposed"];

  function createInitialState() {
    return {
      lifecycle: "ready",
      stack: [],
      pointer: -1,
      limit: DEFAULT_HISTORY_LIMIT,
      pendingStep: null,
      lastChangedAt: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  // Registration-time view of a preset `_KDB.state.history`; keeps stack and pointer, repairs the rest.
  function normalizeHistoryState(historyState) {
    const state = historyState && typeof historyState === "object" ? historyState : {};
    const defaults = createInitialState();
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

  // Generic allowlisted step shape: only key/timestamp/old/new survive. old/new must each be absent (null) or
  // survive a lossless JSON round-trip as an object; anything else (functions, arrays, primitives, cycles,
  // DOM or Cognos objects) rejects the whole step so no live reference reaches `_KDB.state.history`.
  // Owner-specific content nested inside old/new is never interpreted here.
  function normalizeHistoryStep(step) {
    if (!step || typeof step !== "object") {
      return null;
    }
    const key = typeof step.key === "string" ? step.key.trim() : "";
    if (!key) {
      return null;
    }
    const oldValue = readStepValue(step.old);
    const newValue = readStepValue(step.new);
    if (oldValue === undefined || newValue === undefined) {
      return null;
    }
    return { key: key, timestamp: readTimestamp(step.timestamp), old: oldValue, new: newValue };
  }

  function readTimestamp(timestamp) {
    return typeof timestamp === "number" && isFinite(timestamp) ? timestamp : Date.now();
  }

  // Returns the cloned value, null for an absent value, or undefined as the rejection marker.
  function readStepValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    try {
      return _data.cloneJson(value);
    } catch (error) {
      return undefined;
    }
  }

  // Both sides are already JSON-safe copies produced by normalizeHistoryStep.
  function areSameJson(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function reduceHistory(historyState, action) {
    const state = readState(historyState);
    switch (action && action.type) {
      case "history/initialize":
        return copyState(state, { lifecycle: "ready" });
      case "history/commitStep":
        return commitStep(state, action.payload);
      case "history/undoSucceeded":
        return movePointer(state, -1, action.payload);
      case "history/redoSucceeded":
        return movePointer(state, 1, action.payload);
      case "history/writebackBaselineApplied":
        return copyState(state, readyChanges(action.payload, state, { stack: [], pointer: -1 }));
      case "history/error":
        return recordError(state, action.payload);
      case "history/destroy":
        return copyState(state, { lifecycle: "disposed", errorCode: null, errorMessage: null });
      default:
        return state;
    }
  }

  function readState(source) {
    const defaults = createInitialState();
    const raw = source && typeof source === "object" ? source : {};
    const stack = Array.isArray(raw.stack) ? raw.stack : defaults.stack;
    return {
      lifecycle: LIFECYCLES.indexOf(raw.lifecycle) >= 0 ? raw.lifecycle : defaults.lifecycle,
      stack: stack,
      pointer: clampPointer(raw.pointer, stack.length),
      limit: typeof raw.limit === "number" && isFinite(raw.limit) && raw.limit > 0 ? raw.limit : defaults.limit,
      pendingStep: null,
      lastChangedAt: raw.lastChangedAt == null ? null : raw.lastChangedAt,
      errorCode: raw.errorCode == null ? null : String(raw.errorCode),
      errorMessage: raw.errorMessage == null ? null : String(raw.errorMessage),
    };
  }

  function clampPointer(pointer, stackLength) {
    if (typeof pointer !== "number" || !isFinite(pointer)) {
      return stackLength > 0 ? stackLength - 1 : -1;
    }
    return Math.max(-1, Math.min(Math.floor(pointer), stackLength - 1));
  }

  function readLastChangedAt(payload, fallback) {
    const value = payload && payload.lastChangedAt;
    return typeof value === "number" && isFinite(value) ? value : fallback;
  }

  function readyChanges(payload, state, changes) {
    return Object.assign(
      { lifecycle: "ready", lastChangedAt: readLastChangedAt(payload, state.lastChangedAt), errorCode: null, errorMessage: null },
      changes
    );
  }

  function commitStep(state, payload) {
    const step = payload && payload.step ? payload.step : payload;
    if (!step) {
      return state;
    }
    const stack = state.stack.slice(0, state.pointer + 1).concat([step]);
    const kept = stack.length > state.limit ? stack.slice(stack.length - state.limit) : stack;
    return copyState(state, readyChanges(payload, state, { stack: kept, pointer: kept.length - 1 }));
  }

  function movePointer(state, offset, payload) {
    const pointer = clampPointer(state.pointer + offset, state.stack.length);
    return copyState(state, readyChanges(payload, state, { pointer: pointer }));
  }

  function recordError(state, payload) {
    const error = payload || {};
    return copyState(state, {
      lifecycle: "error",
      errorCode: error.errorCode == null ? "historyServiceError" : String(error.errorCode),
      errorMessage: error.errorMessage == null ? null : String(error.errorMessage),
    });
  }

  function copyState(state, changes) {
    return Object.assign({}, state, { pendingStep: null }, changes);
  }

  return {
    DEFAULT_HISTORY_LIMIT: DEFAULT_HISTORY_LIMIT,
    createInitialState: createInitialState,
    normalizeHistoryState: normalizeHistoryState,
    normalizeHistoryStep: normalizeHistoryStep,
    areSameJson: areSameJson,
    reduceHistory: reduceHistory,
  };
});
