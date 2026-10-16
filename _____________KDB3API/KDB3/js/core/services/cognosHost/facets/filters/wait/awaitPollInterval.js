define(["./readAbortState.js"], function (_readAbortState) {
  "use strict";

  function resolveOnAbort(_timeoutId, _resolve) {
    clearTimeout(_timeoutId);
    _resolve();
  }

  function subscribeAbort(_abortSignal, _timeoutId, _resolve) {
    if (!_abortSignal || typeof _abortSignal.addEventListener !== "function") {
      return;
    }
    _abortSignal.addEventListener("abort", resolveOnAbort.bind(null, _timeoutId, _resolve), { once: true });
  }

  function raceIntervalAgainstAbort(_controller, _signal, _ms, _resolve) {
    var timeoutId = setTimeout(_resolve, _ms);
    subscribeAbort(_controller && _controller.signal, timeoutId, _resolve);
    subscribeAbort(_signal, timeoutId, _resolve);
  }

  // Sleep that returns early on either abort source, so a cancelled run never
  // has to sit out the remaining interval.
  function __controller(_controller, _signal, _ms) {
    if (_readAbortState(_signal, _controller) || !(typeof _ms === "number" && _ms > 0)) {
      return Promise.resolve();
    }
    return new Promise(raceIntervalAgainstAbort.bind(null, _controller, _signal, _ms));
  }

  return __controller;
});
