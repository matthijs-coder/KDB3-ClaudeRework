define(["./hasTabInnerFrame.js"], function (_hasTabInnerFrame) {
  "use strict";

  // Bounded abortable poll until the tab-scoped inner-frame predicate is
  // true. Cap matches tab-follow order (4000ms), not waitForTabContainer's 2s.
  // Never uses getCanvasWhenReady / whenCanvasReady as per-tab proof.
  var CAP_MS = 4000;
  var POLL_INTERVAL_MS = 100;

  async function waitForTabInnerFrame(_KDB, _tabId, _pageId) {
    var runtime;
    var timerKey;
    var controller;
    var startedAt;
    try {
      if (_hasTabInnerFrame(_KDB, _tabId, _pageId)) {
        return { ready: true };
      }
      runtime = ensureTabsRuntime(_KDB);
      timerKey = pollKey(_tabId);
      abortPreviousPoll(runtime, timerKey);
      controller = new AbortController();
      runtime.abortControllers[timerKey] = controller;
      startedAt = Date.now();
      while (true) {
        if (controller.signal.aborted) {
          clearPoll(runtime, timerKey);
          return { ready: false };
        }
        if (_hasTabInnerFrame(_KDB, _tabId, _pageId)) {
          clearPoll(runtime, timerKey);
          return { ready: true };
        }
        if (Date.now() - startedAt >= CAP_MS) {
          clearPoll(runtime, timerKey);
          console.warn("[tabs.waitForTabInnerFrame] timed out", _tabId);
          return { ready: false };
        }
        await delay(runtime, timerKey, POLL_INTERVAL_MS, controller.signal);
      }
    } catch (err) {
      if (runtime && timerKey) {
        clearPoll(runtime, timerKey);
      }
      if (err && err.name === "AbortError") {
        return { ready: false };
      }
      console.error("[tabs.waitForTabInnerFrame] failed", _tabId, err);
      return { ready: false };
    }
  }

  function pollKey(_tabId) {
    return "tabInnerFramePoll:" + String(_tabId || "");
  }

  function ensureTabsRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.tabs = _KDB.runtime.tabs || {};
      var runtime = _KDB.runtime.tabs;
      runtime.timers = runtime.timers || {};
      runtime.abortControllers = runtime.abortControllers || {};
      return runtime;
    } catch (err) {
      console.error("[tabs.waitForTabInnerFrame] runtime ensure failed", err);
      throw err;
    }
  }

  function abortPreviousPoll(_runtime, _timerKey) {
    try {
      var previous = _runtime.abortControllers && _runtime.abortControllers[_timerKey];
      if (previous && typeof previous.abort === "function") {
        previous.abort();
      }
      clearPollTimer(_runtime, _timerKey);
    } catch (err) {
      console.error("[tabs.waitForTabInnerFrame] previous poll abort failed", err);
    }
  }

  function clearPoll(_runtime, _timerKey) {
    try {
      clearPollTimer(_runtime, _timerKey);
      if (_runtime.abortControllers) {
        delete _runtime.abortControllers[_timerKey];
      }
    } catch (err) {
      console.error("[tabs.waitForTabInnerFrame] poll clear failed", err);
    }
  }

  function clearPollTimer(_runtime, _timerKey) {
    if (!_runtime || !_runtime.timers || _runtime.timers[_timerKey] == null) {
      return;
    }
    clearTimeout(_runtime.timers[_timerKey]);
    delete _runtime.timers[_timerKey];
  }

  function delay(_runtime, _timerKey, _ms, _signal) {
    return new Promise(runPollDelay.bind(null, _runtime, _timerKey, _ms, _signal));
  }

  function runPollDelay(_runtime, _timerKey, _ms, _signal, _resolve) {
    try {
      if (_signal && _signal.aborted) {
        _resolve();
        return;
      }
      var timerId = setTimeout(onPollDelayTick.bind(null, _runtime, _timerKey, _resolve), _ms);
      _runtime.timers[_timerKey] = timerId;
      if (_signal && typeof _signal.addEventListener === "function") {
        _signal.addEventListener("abort", onPollDelayAborted.bind(null, _runtime, _timerKey, timerId, _resolve), { once: true });
      }
    } catch (err) {
      console.error("[tabs.waitForTabInnerFrame] delay failed", err);
      _resolve();
    }
  }

  function onPollDelayTick(_runtime, _timerKey, _resolve) {
    try {
      delete _runtime.timers[_timerKey];
      _resolve();
    } catch (err) {
      console.error("[tabs.waitForTabInnerFrame] delay tick failed", err);
      _resolve();
    }
  }

  function onPollDelayAborted(_runtime, _timerKey, _timerId, _resolve) {
    try {
      clearTimeout(_timerId);
      if (_runtime.timers) {
        delete _runtime.timers[_timerKey];
      }
      _resolve();
    } catch (err) {
      console.error("[tabs.waitForTabInnerFrame] delay abort failed", err);
      _resolve();
    }
  }

  return waitForTabInnerFrame;
});
