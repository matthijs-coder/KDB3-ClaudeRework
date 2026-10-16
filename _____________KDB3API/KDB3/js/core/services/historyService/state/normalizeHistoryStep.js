define([], function () {
  "use strict";

  // Generic allowlisted step shape: only key/timestamp/old/new survive (any
  // other top-level field is dropped and never relied upon, per
  // historyService-filterInstanceIdentity-contractdelta.md §3 last bullet).
  // old/new must each be absent (null) or a plain serializable object; a
  // value that is not a plain object, or that fails a lossless JSON
  // round-trip (DOM refs, Cognos API objects, functions, circular
  // structures), rejects the whole step instead of letting a live reference
  // leak into _KDB.state.history. Whatever nested fields/dependencies an
  // owner nests inside old/new (e.g. singleSelect identity, sicht
  // dependencies) survive the round-trip untouched: this stays generic and
  // never interprets owner-specific identity.
  function __controller(_step) {
    if (!_step || typeof _step !== "object") {
      return null;
    }
    const key = readStepKey(_step.key);
    if (!key) {
      return null;
    }
    const old = readStepValue(_step.old);
    const next = readStepValue(_step.new);
    if (old === undefined || next === undefined) {
      return null;
    }
    return {
      key: key,
      timestamp: readTimestamp(_step.timestamp),
      old: old,
      new: next,
    };
  }

  function readStepKey(_key) {
    if (typeof _key !== "string") {
      return null;
    }
    const key = _key.trim();
    return key || null;
  }

  function readTimestamp(_timestamp) {
    return typeof _timestamp === "number" && isFinite(_timestamp) ? _timestamp : Date.now();
  }

  // Returns the cloned value, `null` for an absent value, or `undefined` as
  // an explicit rejection marker so the caller can reject the whole step.
  function readStepValue(_value) {
    if (_value === null || _value === undefined) {
      return null;
    }
    if (typeof _value !== "object" || Array.isArray(_value)) {
      return undefined;
    }
    let serialized;
    try {
      serialized = JSON.stringify(_value);
    } catch (error) {
      return undefined;
    }
    if (typeof serialized !== "string") {
      return undefined;
    }
    try {
      return JSON.parse(serialized);
    } catch (error) {
      return undefined;
    }
  }

  return __controller;
});
