define([
  "../runtime/manageBindingApplyTimers.js",
], function (_manageBindingApplyTimers) {
  "use strict";

  function remainingBudgetMs(_startedAt, _timeoutMs) {
    if (typeof _timeoutMs !== "number" || _timeoutMs <= 0) {
      return 0;
    }
    return Math.max(0, _timeoutMs - (Date.now() - _startedAt));
  }

  function raceWithTimeout(_KDB, _promise, _timeoutMs, _signal, _scopeId, _key) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timerId = null;

      function finish(_fn, _value) {
        if (settled) {
          return;
        }
        settled = true;
        _manageBindingApplyTimers.clearBindingApplyTimer(_KDB, _scopeId, _key);
        _fn(_value);
      }

      if (_signal && _signal.aborted) {
        finish(resolve, { timedOut: false, aborted: true, value: null });
        return;
      }

      if (_signal) {
        _signal.addEventListener(
          "abort",
          function () {
            finish(resolve, { timedOut: false, aborted: true, value: null });
          },
          { once: true }
        );
      }

      Promise.resolve(_promise)
        .then(function (value) {
          finish(resolve, { timedOut: false, aborted: false, value: value });
        })
        .catch(function (err) {
          finish(reject, err);
        });

      if (typeof _timeoutMs === "number" && _timeoutMs > 0) {
        timerId = setTimeout(function () {
          finish(resolve, { timedOut: true, aborted: false, value: null });
        }, _timeoutMs);
        _manageBindingApplyTimers.registerBindingApplyTimer(_KDB, _scopeId, _key, timerId);
      }
    });
  }

  return {
    remainingBudgetMs: remainingBudgetMs,
    raceWithTimeout: raceWithTimeout,
  };
});
