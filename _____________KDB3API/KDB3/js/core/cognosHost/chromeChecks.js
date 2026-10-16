define([], function () {
  "use strict";

  function ensureRuntime(_KDB) {
    var rt;
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.cognosHost = _KDB.runtime.cognosHost || {};
    rt = _KDB.runtime.cognosHost;
    rt.selectorMeta = rt.selectorMeta || {};
    rt.pendingWaits = typeof rt.pendingWaits === "number" ? rt.pendingWaits : 0;
    rt.misses = rt.misses || {};
    rt.waitKeys = rt.waitKeys || {};
    rt.waitCounts = rt.waitCounts || {};
    rt.flushRequested = !!rt.flushRequested;
    rt.flushed = !!rt.flushed;
    return rt;
  }

  function logMiss(rt, key) {
    var meta = rt.selectorMeta[key];
    if (meta && meta.required) {
      if (!rt.misses[key]) rt.misses[key] = { key: key, selector: meta.selector };
      console.error("[cognosHost.chrome] required selector missed", { key: key, selector: meta.selector });
    } else {
      console.debug("[cognosHost.chrome] optional selector missed", { key: key, selector: meta && meta.selector });
    }
  }

  function flushReport(_KDB, rt) {
    var messageService;
    try {
      if (_KDB._isDisposed) return;
      if (Object.keys(rt.misses || {}).length === 0) return;
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

  function maybeFlush(_KDB, rt) {
    if (!rt.flushRequested || rt.flushed || rt.pendingWaits > 0) return;
    rt.flushed = true;
    flushReport(_KDB, rt);
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

  function endWait(_KDB, key, outcome) {
    var rt;
    var result = outcome || {};
    try {
      rt = ensureRuntime(_KDB);
      if (rt.waitCounts[key] > 0) rt.waitCounts[key] -= 1;
      if ((rt.waitCounts[key] || 0) === 0 && rt.waitKeys[key] === true) {
        rt.waitKeys[key] = "done";
        rt.pendingWaits = Math.max(0, rt.pendingWaits - 1);
      }
      if (!_KDB._isDisposed && !result.aborted && !result.found) logMiss(rt, key);
      maybeFlush(_KDB, rt);
    } catch (error) {
      console.error("[cognosHost.chromeChecks.endWait] failed", key, error);
    }
  }

  function recordSyncMiss(_KDB, key) {
    var rt;
    try {
      if (_KDB._isDisposed) return;
      rt = ensureRuntime(_KDB);
      logMiss(rt, key);
      maybeFlush(_KDB, rt);
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
        return Promise.reject(err);
      }
    );
  }

  function flushIfDue(_KDB) {
    try {
      maybeFlush(_KDB, ensureRuntime(_KDB));
    } catch (error) {
      console.error("[cognosHost.chromeChecks.flushIfDue] failed", error);
    }
  }

  function scheduleFlush(_KDB) {
    try {
      ensureRuntime(_KDB).flushRequested = true;
      Promise.resolve().then(function () {
        flushIfDue(_KDB);
      });
    } catch (error) {
      console.error("[cognosHost.chromeChecks.scheduleFlush] failed", error);
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
