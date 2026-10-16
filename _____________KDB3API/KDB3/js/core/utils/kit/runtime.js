/*
 * kit/runtime.js: the standard `_KDB.runtime.<owner>` buckets, their teardown, tracked timers,
 * and the read-only "tabs busy" check.
 *
 * RUNTIME_BUCKETS                         ["domRefs", "listeners", "subscriptions", "abortControllers",
 *                                          "observers", "timers", "pendingPromises"]
 * ensureRuntime(_KDB, name, defaults?)    Get-or-create _KDB.runtime[name]; copies each `defaults` key that is
 *                                          still undefined, then fills missing buckets with {}. Returns it.
 * ensureRuntimeBuckets(rt)                Fill missing buckets on any runtime object (e.g. a per-widget runtime).
 * disposeRuntimeBuckets(rt)               Release every entry, then reset each bucket ([] stays [], else {}).
 *                                          Returns the errors thrown by individual entries (never throws).
 * scheduleTimeout(timers, key, fn, ms)    Cancel timers[key], then setTimeout; stores { kind: "timeout", id }.
 * scheduleFrame(timers, key, fn)          Same with requestAnimationFrame ({ kind: "raf", id }); falls back to
 *                                          a 0 ms timeout when rAF is unavailable. Both drop timers[key] when fired.
 * clearTimer(timers, key)                 Cancel and delete timers[key]. Returns true if something was cancelled.
 * cancelTimer(entry)                      Cancel a number (timeout id), { kind, id } entry, or array of these.
 *                                          kind "raf" uses cancelAnimationFrame; any other kind uses clearTimeout
 *                                          (which also clears setInterval ids).
 * readTabsBusy(_KDB, keys?)               True if any of runtime.tabs.pendingPromises[keys] is set.
 *                                          Default keys: TABS_BUSY_KEYS = ["traverse", "startup", "tabMutation"].
 *
 * What disposeRuntimeBuckets releases (arrays and nested plain-object maps are walked, max depth 4):
 *   abortControllers  entry.abort()
 *   subscriptions     entry() if a function, else entry.unsubscribe()
 *   listeners         entry() if a function, else { target|element, type, handler, options|capture }
 *                     is removed with removeEventListener
 *   observers         entry.disconnect()
 *   timers            cancelTimer(entry). A bare number is treated as a setTimeout id: store rAF ids as
 *                     { kind: "raf", id } (or use scheduleFrame) before adopting this helper.
 *   domRefs, pendingPromises   only reset (nodes are not removed, promises cannot be cancelled).
 */
define([], function () {
  "use strict";

  var RUNTIME_BUCKETS = ["domRefs", "listeners", "subscriptions", "abortControllers", "observers", "timers", "pendingPromises"];
  var TABS_BUSY_KEYS = ["traverse", "startup", "tabMutation"];
  var MAX_WALK_DEPTH = 4;

  /**
   * @param {object} rt
   * @returns {object} rt
   */
  function ensureRuntimeBuckets(rt) {
    RUNTIME_BUCKETS.forEach(function (name) {
      if (!rt[name] || typeof rt[name] !== "object") {
        rt[name] = {};
      }
    });
    return rt;
  }

  /**
   * @param {object} _KDB
   * @param {string} name   runtime owner key, e.g. "dragDrop"
   * @param {object} [defaults]  owner-specific fields; evaluated by the caller, so literals are fresh per call
   * @returns {object} _KDB.runtime[name]
   */
  function ensureRuntime(_KDB, name, defaults) {
    _KDB.runtime = _KDB.runtime || {};
    var rt = _KDB.runtime[name] || (_KDB.runtime[name] = {});
    Object.keys(defaults || {}).forEach(function (key) {
      if (rt[key] === undefined) {
        rt[key] = defaults[key];
      }
    });
    return ensureRuntimeBuckets(rt);
  }

  function isWalkable(value) {
    if (Array.isArray(value)) {
      return true;
    }
    var proto = value !== null && typeof value === "object" ? Object.getPrototypeOf(value) : undefined;
    return proto === Object.prototype || proto === null;
  }

  function isTimerEntry(entry) {
    return !!entry && typeof entry === "object" && typeof entry.kind === "string" && "id" in entry;
  }

  /**
   * @param {number|{kind: string, id: *}|Array} entry
   * @returns {boolean} true if the entry was recognised as a timer
   */
  function cancelTimer(entry) {
    if (typeof entry === "number") {
      clearTimeout(entry);
      return true;
    }
    if (Array.isArray(entry)) {
      return entry.map(cancelTimer).indexOf(true) >= 0;
    }
    if (!isTimerEntry(entry)) {
      return false;
    }
    if (entry.kind === "raf") {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(entry.id);
      }
    } else {
      clearTimeout(entry.id);
    }
    return true;
  }

  function releaseVia(method, allowFunction) {
    return function (entry) {
      if (allowFunction && typeof entry === "function") {
        entry();
        return true;
      }
      if (entry && typeof entry[method] === "function") {
        entry[method]();
        return true;
      }
      return false;
    };
  }

  function releaseListener(entry) {
    if (typeof entry === "function") {
      entry();
      return true;
    }
    var target = entry && (entry.target || entry.element);
    if (!target || typeof target.removeEventListener !== "function" || typeof entry.handler !== "function") {
      return false;
    }
    target.removeEventListener(entry.type, entry.handler, entry.options !== undefined ? entry.options : { capture: entry.capture === true });
    return true;
  }

  var RELEASERS = {
    abortControllers: releaseVia("abort", false),
    subscriptions: releaseVia("unsubscribe", true),
    listeners: releaseListener,
    observers: releaseVia("disconnect", false),
    timers: cancelTimer
  };

  // Teardown boundary: one failing entry must not keep the remaining entries alive.
  function drain(entry, release, errors, depth) {
    if (entry === null || entry === undefined) {
      return;
    }
    try {
      if (release(entry)) {
        return;
      }
    } catch (error) {
      errors.push(error);
      return;
    }
    if (depth < MAX_WALK_DEPTH && isWalkable(entry)) {
      Object.keys(entry).forEach(function (key) {
        drain(entry[key], release, errors, depth + 1);
      });
    }
  }

  /**
   * @param {object} rt  a runtime object holding the standard buckets
   * @returns {Error[]} errors thrown while releasing entries (empty when clean)
   */
  function disposeRuntimeBuckets(rt) {
    var errors = [];
    if (!rt || typeof rt !== "object") {
      return errors;
    }
    Object.keys(RELEASERS).forEach(function (name) {
      var bucket = rt[name];
      if (isWalkable(bucket)) {
        Object.keys(bucket).forEach(function (key) {
          drain(bucket[key], RELEASERS[name], errors, 1);
        });
      }
    });
    RUNTIME_BUCKETS.forEach(function (name) {
      rt[name] = Array.isArray(rt[name]) ? [] : {};
    });
    return errors;
  }

  function schedule(timers, key, kind, callback, delayMs) {
    clearTimer(timers, key);
    var entry = { kind: kind, id: null };
    function run(arg) {
      if (timers[key] === entry) {
        delete timers[key];
      }
      callback(arg);
    }
    entry.id = kind === "raf" ? requestAnimationFrame(run) : setTimeout(run, delayMs > 0 ? delayMs : 0);
    timers[key] = entry;
    return entry;
  }

  /**
   * @param {object} timers  a runtime `timers` bucket
   * @param {string} key
   * @param {Function} callback
   * @param {number} [delayMs]
   * @returns {{kind: "timeout", id: *}}
   */
  function scheduleTimeout(timers, key, callback, delayMs) {
    return schedule(timers, key, "timeout", callback, delayMs);
  }

  /**
   * @param {object} timers
   * @param {string} key
   * @param {Function} callback  receives the rAF timestamp (undefined on the timeout fallback)
   * @returns {{kind: "raf"|"timeout", id: *}}
   */
  function scheduleFrame(timers, key, callback) {
    var kind = typeof requestAnimationFrame === "function" ? "raf" : "timeout";
    return schedule(timers, key, kind, callback, 0);
  }

  /**
   * @param {object} timers
   * @param {string} key
   * @returns {boolean} true if an entry was cancelled
   */
  function clearTimer(timers, key) {
    if (!timers || timers[key] === undefined) {
      return false;
    }
    var entry = timers[key];
    delete timers[key];
    return cancelTimer(entry);
  }

  /**
   * @param {object} _KDB
   * @param {string[]} [keys]  subset of pending tabs operations to test, default TABS_BUSY_KEYS
   * @returns {boolean}
   */
  function readTabsBusy(_KDB, keys) {
    var pending = _KDB && _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises;
    if (!pending) {
      return false;
    }
    return (keys || TABS_BUSY_KEYS).some(function (key) { return !!pending[key]; });
  }

  return {
    RUNTIME_BUCKETS: RUNTIME_BUCKETS,
    TABS_BUSY_KEYS: TABS_BUSY_KEYS,
    ensureRuntime: ensureRuntime,
    ensureRuntimeBuckets: ensureRuntimeBuckets,
    disposeRuntimeBuckets: disposeRuntimeBuckets,
    scheduleTimeout: scheduleTimeout,
    scheduleFrame: scheduleFrame,
    clearTimer: clearTimer,
    cancelTimer: cancelTimer,
    readTabsBusy: readTabsBusy
  };
});
