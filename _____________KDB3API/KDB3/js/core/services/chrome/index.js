/*
 * services.chrome: read accessor over the Cognos chrome checks (`_KDB.runtime.cognosHost.chromeChecks`, installed by
 * core/cognosHost/registerCognosHostSelectors.js). Features use it instead of reading the cognosHost runtime.
 *
 *   readChromeChecks()        -> chromeChecks object | null (null when the runtime or the checks are absent)
 *   trackWait(key, promise)   -> the promise tracked as a chrome wait; without checks the SAME promise is returned
 *   beginWait(key)            -> undefined
 *   endWait(key, outcome)     -> undefined   (outcome: { aborted?, found? })
 *   recordSyncMiss(key)       -> undefined
 *   scheduleFlush()           -> undefined
 *
 * Missing checks (or a method missing on partial checks) never throw: wait and miss calls are no-ops, trackWait
 * hands the promise back untouched, exactly as the former per-feature readers did. The checks are resolved on
 * every call, so a replaced checks object is seen. The failure handling inside the checks (log, disposed
 * instance) is unchanged. scheduleFlush also has the boundary core/bootstrap/renderBoundary.js had (a throwing
 * checks object is logged as `[core.chromeCapability] scheduleFlush failed`, never thrown). Stateless: nothing to
 * tear down.
 */
define([], function () {
  "use strict";

  function readChromeChecks(_KDB) {
    var host = _KDB && _KDB.runtime ? _KDB.runtime.cognosHost : null;
    return host && host.chromeChecks ? host.chromeChecks : null;
  }

  function createChromeService(_KDB) {
    function readMethod(name) {
      var checks = readChromeChecks(_KDB);
      return checks && typeof checks[name] === "function" ? checks[name].bind(checks) : null;
    }

    function trackWait(key, promise) {
      var track = readMethod("trackWait");
      return track ? track(_KDB, key, promise) : promise;
    }

    function beginWait(key) {
      var begin = readMethod("beginWait");
      if (begin) begin(_KDB, key);
    }

    function endWait(key, outcome) {
      var end = readMethod("endWait");
      if (end) end(_KDB, key, outcome);
    }

    function recordSyncMiss(key) {
      var record = readMethod("recordSyncMiss");
      if (record) record(_KDB, key);
    }

    function scheduleFlush() {
      var flush = readMethod("scheduleFlush");
      if (!flush) return;
      try {
        flush(_KDB);
      } catch (error) {
        console.error("[core.chromeCapability] scheduleFlush failed", error);
      }
    }

    return {
      readChromeChecks: readChromeChecks.bind(null, _KDB),
      trackWait: trackWait,
      beginWait: beginWait,
      endWait: endWait,
      recordSyncMiss: recordSyncMiss,
      scheduleFlush: scheduleFlush
    };
  }

  function registerChrome(_KDB) {
    _KDB.services = _KDB.services || {};
    if (!_KDB.services.chrome) {
      _KDB.services.chrome = createChromeService(_KDB);
    }
    return _KDB.services.chrome;
  }

  return registerChrome;
});
