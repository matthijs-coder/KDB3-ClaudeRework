/*
 * kit/async.js: abort-aware waiting.
 *
 * sleep(ms, signal?)  Promise<boolean>: true after ms, false as soon as a signal aborts.
 *                     `signal` is one AbortSignal or an array of them (null entries ignored).
 *                     Never rejects. Adds at most one abort listener per signal and removes it
 *                     on both paths, so a long poll loop does not accumulate listeners.
 *                     Delays above 2^31-1 ms (~24.8 days, incl. Infinity) are capped to that value.
 * pollUntil(options)  Promise<PollOutcome>. Calls check() until predicate(value) is true.
 *   options.check(info)     required; may be async; info = { attempt, elapsedMs, signal }.
 *                           A throw counts as "not ready yet" and is kept as lastError.
 *                           A check() that never settles is not interrupted by the timeout or abort:
 *                           pass info.signal into the awaited host call, or keep check() synchronous.
 *   options.timeoutMs       required, > 0. Infinity is allowed but must be passed explicitly.
 *   options.intervalMs      delay between attempts, default 100.
 *   options.backoff         interval multiplier per attempt (>= 1), default 1 (fixed interval).
 *   options.maxIntervalMs   cap for the backed-off interval, default 1000.
 *   options.predicate(v)    readiness test, default Boolean(v).
 *   options.signal          AbortSignal or array of AbortSignals.
 *   PollOutcome: { ok: true, value, attempts, elapsedMs }
 *              | { ok: false, reason: "timeout" | "aborted", lastError, attempts, elapsedMs }
 *   Never rejects for timeout/abort; rejects (TypeError) only on invalid options.
 */
define([], function () {
  "use strict";

  var MAX_TIMER_DELAY_MS = 2147483647;

  function toSignalList(signal) {
    var list = Array.isArray(signal) ? signal : [signal];
    return list.filter(function (entry, index) {
      return !!entry && typeof entry.addEventListener === "function" && list.indexOf(entry) === index;
    });
  }

  function anyAborted(signals) {
    return signals.some(function (entry) { return entry.aborted === true; });
  }

  /**
   * @param {number} ms
   * @param {AbortSignal|AbortSignal[]} [signal]
   * @returns {Promise<boolean>} true when the full delay elapsed, false when aborted
   */
  function sleep(ms, signal) {
    var signals = toSignalList(signal);
    if (anyAborted(signals)) {
      return Promise.resolve(false);
    }
    if (!(ms > 0)) {
      return Promise.resolve(true);
    }
    return new Promise(function (resolve) {
      var timerId = null;
      function finish(completed) {
        clearTimeout(timerId);
        signals.forEach(function (entry) { entry.removeEventListener("abort", onAbort); });
        resolve(completed);
      }
      function onAbort() {
        finish(false);
      }
      signals.forEach(function (entry) { entry.addEventListener("abort", onAbort); });
      timerId = setTimeout(finish, Math.min(ms, MAX_TIMER_DELAY_MS), true);
    });
  }

  function readPositive(value, fallback) {
    return typeof value === "number" && value > 0 ? value : fallback;
  }

  function failure(reason, lastError, attempts, startedAt) {
    return { ok: false, reason: reason, lastError: lastError, attempts: attempts, elapsedMs: Date.now() - startedAt };
  }

  /**
   * @param {{check: Function, timeoutMs: number, intervalMs?: number, backoff?: number,
   *          maxIntervalMs?: number, predicate?: Function, signal?: AbortSignal|AbortSignal[]}} options
   * @returns {Promise<object>} PollOutcome (see header)
   */
  async function pollUntil(options) {
    var opts = options || {};
    if (typeof opts.check !== "function") {
      throw new TypeError("pollUntil: options.check must be a function");
    }
    if (typeof opts.timeoutMs !== "number" || !(opts.timeoutMs > 0)) {
      throw new TypeError("pollUntil: options.timeoutMs is required (> 0; pass Infinity explicitly to wait unbounded)");
    }
    var predicate = typeof opts.predicate === "function" ? opts.predicate : Boolean;
    var intervalMs = readPositive(opts.intervalMs, 100);
    var maxIntervalMs = Math.max(intervalMs, readPositive(opts.maxIntervalMs, 1000));
    var backoff = typeof opts.backoff === "number" && opts.backoff >= 1 ? opts.backoff : 1;
    var signals = toSignalList(opts.signal);
    var startedAt = Date.now();
    var attempts = 0;
    var lastError = null;
    var value;
    while (true) {
      if (anyAborted(signals)) {
        return failure("aborted", lastError, attempts, startedAt);
      }
      attempts += 1;
      try {
        value = await opts.check({ attempt: attempts, elapsedMs: Date.now() - startedAt, signal: opts.signal });
        if (predicate(value)) {
          return { ok: true, value: value, attempts: attempts, elapsedMs: Date.now() - startedAt };
        }
      } catch (error) {
        lastError = error;
      }
      if (anyAborted(signals)) {
        return failure("aborted", lastError, attempts, startedAt);
      }
      var remainingMs = opts.timeoutMs - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        return failure("timeout", lastError, attempts, startedAt);
      }
      if (!(await sleep(Math.min(intervalMs, remainingMs), signals))) {
        return failure("aborted", lastError, attempts, startedAt);
      }
      intervalMs = Math.min(intervalMs * backoff, maxIntervalMs);
    }
  }

  return {
    sleep: sleep,
    pollUntil: pollUntil
  };
});
