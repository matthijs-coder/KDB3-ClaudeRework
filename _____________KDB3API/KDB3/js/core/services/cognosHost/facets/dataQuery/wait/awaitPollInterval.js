define([], function () {
  "use strict";

  function isAborted(_signal, _controller) {
    if (_controller && _controller.signal && _controller.signal.aborted === true) {
      return true;
    }
    return !!(_signal && _signal.aborted === true);
  }

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

  function awaitPollInterval(_controller, _signal, _ms) {
    if (isAborted(_signal, _controller) || !(typeof _ms === "number" && _ms > 0)) {
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      var timeoutId = setTimeout(resolve, _ms);
      subscribeAbort(_controller && _controller.signal, timeoutId, resolve);
      subscribeAbort(_signal, timeoutId, resolve);
    });
  }

  return awaitPollInterval;
});
