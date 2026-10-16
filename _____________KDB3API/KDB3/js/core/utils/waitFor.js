define(["./kit/async.js", "./kit/errors.js"], function (_async, _errors) {
  "use strict";

  // Resolves with the first value that satisfies `predicate`. A throwing check or predicate counts as "not ready yet".
  // timeoutMs <= 0 waits unbounded. Rejects with WAITFOR_TIMEOUT, or ABORTED when `signal` aborts first.
  async function waitFor(_conditionFn, _options) {
    const opts = _options || {};
    const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 0;
    const outcome = await _async.pollUntil({
      check: _conditionFn,
      intervalMs: opts.interval === undefined ? 100 : opts.interval,
      timeoutMs: timeoutMs > 0 ? timeoutMs : Infinity,
      predicate: opts.predicate,
      signal: opts.signal
    });

    if (outcome.ok) {
      return outcome.value;
    }
    if (outcome.reason === "aborted") {
      throw _errors.codedError("ABORTED", "waitFor aborted");
    }
    throw _errors.codedError("WAITFOR_TIMEOUT", "waitFor timed out after " + timeoutMs + "ms");
  }

  return waitFor;
});
