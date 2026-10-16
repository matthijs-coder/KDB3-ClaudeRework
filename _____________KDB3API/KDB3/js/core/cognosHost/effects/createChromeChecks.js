define([], function () {
  "use strict";

  function ensureRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.cognosHost = _KDB.runtime.cognosHost || {};
      var rt = _KDB.runtime.cognosHost;
      rt.selectorMeta = rt.selectorMeta || {};
      rt.pendingWaits = typeof rt.pendingWaits === "number" ? rt.pendingWaits : 0;
      rt.misses = rt.misses || {};
      rt.waitKeys = rt.waitKeys || {};
      rt.waitCounts = rt.waitCounts || {};
      rt.flushRequested = !!rt.flushRequested;
      rt.flushed = !!rt.flushed;
      return rt;
    } catch (error) {
      console.error("[cognosHost.chromeChecks.ensureRuntime] failed", error);
      throw error;
    }
  }

  function beginWait(_KDB, key) {
    var rt;
    try {
      rt = ensureRuntime(_KDB);
      rt.waitCounts[key] = (rt.waitCounts[key] || 0) + 1;
      if (rt.waitKeys[key] === true) return;
      rt.waitKeys[key] = true;
      rt.pendingWaits += 1;
    } catch (error) {
      console.error("[cognosHost.chromeChecks.beginWait] failed", key, error);
    }
  }

  function recordMiss(rt, key, selector) {
    if (rt.misses[key]) return;
    rt.misses[key] = { key: key, selector: selector };
  }

  function endWait(_KDB, key, outcome) {
    var rt;
    var meta;
    try {
      rt = ensureRuntime(_KDB);
      meta = rt.selectorMeta[key];
      outcome = outcome || {};
      if (rt.waitCounts[key] > 0) rt.waitCounts[key] -= 1;
      if ((rt.waitCounts[key] || 0) === 0 && rt.waitKeys[key] === true) {
        rt.waitKeys[key] = "done";
        rt.pendingWaits = Math.max(0, rt.pendingWaits - 1);
      }
      if (_KDB._isDisposed || outcome.aborted) {
        maybeFlush(_KDB);
        return;
      }
      if (!outcome.found && meta && meta.required) {
        recordMiss(rt, key, meta.selector);
        console.error("[cognosHost.chrome] required selector missed", { key: key, selector: meta.selector });
      } else if (!outcome.found) {
        console.debug("[cognosHost.chrome] optional selector missed", { key: key, selector: meta && meta.selector });
      }
      maybeFlush(_KDB);
    } catch (error) {
      console.error("[cognosHost.chromeChecks.endWait] failed", key, error);
    }
  }

  function recordSyncMiss(_KDB, key) {
    var rt;
    var meta;
    try {
      if (_KDB._isDisposed) return;
      rt = ensureRuntime(_KDB);
      meta = rt.selectorMeta[key];
      if (meta && meta.required) {
        recordMiss(rt, key, meta.selector);
        console.error("[cognosHost.chrome] required selector missed", { key: key, selector: meta.selector });
      } else {
        console.debug("[cognosHost.chrome] optional selector missed", { key: key, selector: meta && meta.selector });
      }
      maybeFlush(_KDB);
    } catch (error) {
      console.error("[cognosHost.chromeChecks.recordSyncMiss] failed", key, error);
    }
  }

  function trackWait(_KDB, key, promise) {
    beginWait(_KDB, key);
    return Promise.resolve(promise).then(
      function onFound(el) {
        endWait(_KDB, key, { found: !!el });
        return el;
      },
      function onFail(err) {
        endWait(_KDB, key, { aborted: !!(err && err.code === "ABORTED"), found: false });
        throw err;
      }
    );
  }

  function scheduleFlush(_KDB) {
    var rt;
    try {
      rt = ensureRuntime(_KDB);
      rt.flushRequested = true;
      Promise.resolve().then(function () {
        maybeFlush(_KDB);
      });
    } catch (error) {
      console.error("[cognosHost.chromeChecks.scheduleFlush] failed", error);
    }
  }

  function maybeFlush(_KDB) {
    var rt;
    try {
      rt = ensureRuntime(_KDB);
      if (!rt.flushRequested || rt.flushed || rt.pendingWaits > 0) return;
      rt.flushed = true;
      flushReport(_KDB, rt);
    } catch (error) {
      console.error("[cognosHost.chromeChecks.maybeFlush] failed", error);
    }
  }

  function flushReport(_KDB, rt) {
    var keys;
    var messageService;
    try {
      if (_KDB._isDisposed) return;
      keys = Object.keys(rt.misses || {});
      if (keys.length === 0) return;
      messageService = _KDB.services && _KDB.services.message;
      if (!messageService || typeof messageService.showAlert !== "function") return;
      messageService.showAlert({
        title: "Dashboard",
        severity: "error",
        message: "Teile der Dashboard-Oberfläche konnten nicht geladen werden. Bitte das Dashboard schließen und erneut öffnen. Details stehen in der Browser-Konsole."
      });
    } catch (messageError) {
      console.warn("[cognosHost.chrome] failure message failed", messageError);
    }
  }

  function createChromeChecks() {
    return {
      ensureRuntime: ensureRuntime,
      beginWait: beginWait,
      endWait: endWait,
      recordSyncMiss: recordSyncMiss,
      trackWait: trackWait,
      scheduleFlush: scheduleFlush
    };
  }

  return createChromeChecks;
});
