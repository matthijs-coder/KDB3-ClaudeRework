define([], function () {
  function scheduleWidgetBasePollDelay(_runtime, _timerKey, _delayMs, _callback) {
    try {
      const runtime = _runtime || {};
      runtime.timers = runtime.timers || {};
      if (runtime.timers[_timerKey] != null) {
        clearTimeout(runtime.timers[_timerKey]);
      }
      runtime.timers[_timerKey] = setTimeout(_callback, _delayMs);
    } catch (err) {
      console.error("[widgetBase.scheduleWidgetBasePollDelay] failed", _timerKey, err);
    }
  }

  function ensureWidgetBasePollRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.widgetBase = _KDB.runtime.widgetBase || {};
      const runtime = _KDB.runtime.widgetBase;
      runtime.timers = runtime.timers || {};
      runtime.abortControllers = runtime.abortControllers || {};
      return runtime;
    } catch (err) {
      console.error("[widgetBase.ensureWidgetBasePollRuntime] failed", err);
      throw err;
    }
  }

  function createPollAbortController() {
    if (typeof AbortController === "function") {
      return new AbortController();
    }
    var listeners = [];
    var signal = {
      aborted: false,
      addEventListener: function (type, fn) {
        if (type === "abort" && typeof fn === "function") {
          listeners.push(fn);
        }
      }
    };
    return {
      signal: signal,
      abort: function () {
        var index;
        if (signal.aborted) {
          return;
        }
        signal.aborted = true;
        index = 0;
        while (index < listeners.length) {
          listeners[index]();
          index += 1;
        }
      }
    };
  }

  function beginAbortablePoll(_runtime, _timerKey, _startPoll) {
    try {
      const previous = _runtime.abortControllers[_timerKey];
      const controller = createPollAbortController();
      if (previous && typeof previous.abort === "function") {
        previous.abort();
      }
      _runtime.abortControllers[_timerKey] = controller;
      return new Promise(runAbortablePollStart.bind(null, _runtime, _timerKey, _startPoll, controller));
    } catch (err) {
      console.error("[widgetBase.beginAbortablePoll] failed", _timerKey, err);
      return Promise.resolve();
    }
  }

  function runAbortablePollStart(_runtime, _timerKey, _startPoll, _controller, resolve) {
    try {
      const signal = _controller.signal;
      if (signal && typeof signal.addEventListener === "function") {
        signal.addEventListener("abort", onPollWaitAborted.bind(null, _runtime, _timerKey, resolve), { once: true });
      }
      if (signal.aborted) {
        onPollWaitAborted(_runtime, _timerKey, resolve);
        return;
      }
      _startPoll(resolve, signal);
    } catch (err) {
      console.error("[widgetBase.runAbortablePollStart] failed", _timerKey, err);
      resolve();
    }
  }

  function finishPollWait(_runtime, _timerKey, _resolve) {
    try {
      clearPollTimer(_runtime, _timerKey);
      if (_runtime.abortControllers) {
        delete _runtime.abortControllers[_timerKey];
      }
      _resolve();
    } catch (err) {
      console.error("[widgetBase.finishPollWait] failed", _timerKey, err);
      _resolve();
    }
  }

  function onPollWaitAborted(_runtime, _timerKey, _resolve) {
    try {
      clearPollTimer(_runtime, _timerKey);
      _resolve();
    } catch (err) {
      console.error("[widgetBase.onPollWaitAborted] failed", _timerKey, err);
      _resolve();
    }
  }

  function clearPollTimer(_runtime, _timerKey) {
    if (!_runtime || !_runtime.timers) {
      return;
    }
    clearTimeout(_runtime.timers[_timerKey]);
    delete _runtime.timers[_timerKey];
  }

  return {
    scheduleWidgetBasePollDelay: scheduleWidgetBasePollDelay,
    ensureWidgetBasePollRuntime: ensureWidgetBasePollRuntime,
    beginAbortablePoll: beginAbortablePoll,
    finishPollWait: finishPollWait
  };
});
