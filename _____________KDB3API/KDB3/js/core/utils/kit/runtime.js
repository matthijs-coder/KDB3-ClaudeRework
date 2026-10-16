/*
 * kit/runtime.js: the standard `_KDB.runtime.<owner>` buckets, their teardown, tracked timers,
 * and the read-only "tabs busy" check.
 *
 * RUNTIME_BUCKETS                         ["domRefs", "listeners", "subscriptions", "abortControllers",
 *                                          "observers", "timers", "pendingPromises"]
 * ensureRuntime(_KDB, name, defaults?)    Get-or-create _KDB.runtime[name]; copies each `defaults` key that is
 *                                          still undefined, then fills missing buckets with {}. Returns it.
 * ensureRuntimeBuckets(rt)                Fill missing buckets on any runtime object (e.g. a per-widget runtime).
 * disposeRuntimeBuckets(rt)               Release recognised entries, then reset each bucket ([] stays [], else {}).
 *                                          Never throws: errors from entries and from the reset are returned.
 * addListener(listeners, key, target, type, handler, options?)
 *                                          Release listeners[key], addEventListener, store and return the canonical
 *                                          record { target, type, handler, options }.
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
 * What disposeRuntimeBuckets releases. It visits each bucket's direct values; a direct value that is an
 * array contributes its elements. Nothing deeper is visited, except id maps in `timers` (below). Any entry
 * whose shape is not listed is skipped untouched: functions nested inside objects are never called.
 *   abortControllers  entry.abort()
 *   subscriptions     entry() if a function, else entry.unsubscribe() if present
 *   listeners         entry() if a function. Any object with a handler/listener/type key is a listener record:
 *                     { target|element, type, handler|listener, options|capture } is removed with
 *                     removeEventListener when target and handler are usable, otherwise skipped.
 *   observers         entry.disconnect()
 *   timers            numbers and { kind, id } entries (cancelTimer). A direct value whose key follows the
 *                     `<thing>By<Key>` convention (e.g. watchdogsByMountKey) is an id map: its values are
 *                     cancelled too. Other objects ({ handle, attempts, ... } records) are skipped.
 *                     A bare number is a setTimeout id: store rAF ids as { kind: "raf", id } (or use
 *                     scheduleFrame) before adopting this helper.
 *   domRefs, pendingPromises   only reset (nodes are not removed, promises cannot be cancelled).
 * Owner extras stay with the owner: re-create nested default maps, remove DOM nodes, reset owner fields,
 * and log the returned errors where the old cleanup logged.
 */
define([], function () {
  "use strict";

  var RUNTIME_BUCKETS = ["domRefs", "listeners", "subscriptions", "abortControllers", "observers", "timers", "pendingPromises"];
  var TABS_BUSY_KEYS = ["traverse", "startup", "tabMutation"];
  var ID_MAP_KEY = /By[A-Z0-9_$][\w$]*$/;

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

  function isPlainMap(value) {
    var proto = value !== null && typeof value === "object" ? Object.getPrototypeOf(value) : undefined;
    return proto === Object.prototype || proto === null;
  }

  function isTimerEntry(entry) {
    return !!entry && typeof entry === "object" && typeof entry.kind === "string" && "id" in entry;
  }

  function cancelSingleTimer(entry) {
    if (typeof entry === "number") {
      clearTimeout(entry);
      return true;
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

  /**
   * @param {number|{kind: string, id: *}|Array} entry  an array is cancelled element by element (one level)
   * @returns {boolean} true if at least one timer was recognised
   */
  function cancelTimer(entry) {
    if (Array.isArray(entry)) {
      return entry.map(cancelSingleTimer).indexOf(true) >= 0;
    }
    return cancelSingleTimer(entry);
  }

  function releaseVia(method, allowFunction) {
    return function (entry) {
      if (allowFunction && typeof entry === "function") {
        entry();
      } else if (entry && typeof entry[method] === "function") {
        entry[method]();
      }
    };
  }

  function isListenerRecord(entry) {
    return !!entry && typeof entry === "object" && ("handler" in entry || "listener" in entry || "type" in entry);
  }

  function releaseListener(entry) {
    if (typeof entry === "function") {
      entry();
      return;
    }
    if (!isListenerRecord(entry)) {
      return;
    }
    var target = entry.target || entry.element;
    var handler = entry.handler || entry.listener;
    if (!target || typeof target.removeEventListener !== "function" || typeof handler !== "function") {
      return;
    }
    var options = entry.options !== undefined ? entry.options : entry.capture === true;
    target.removeEventListener(entry.type, handler, typeof options === "boolean" ? { capture: options } : options);
  }

  var RELEASERS = {
    abortControllers: releaseVia("abort", false),
    subscriptions: releaseVia("unsubscribe", true),
    listeners: releaseListener,
    observers: releaseVia("disconnect", false),
    timers: cancelSingleTimer
  };

  // Teardown boundary: one failing entry must not keep the remaining entries alive.
  function releaseEntry(entry, release, errors) {
    try {
      release(entry);
    } catch (error) {
      errors.push(error);
    }
  }

  function drainBucket(name, bucket, errors) {
    var release = RELEASERS[name];
    Object.keys(bucket).forEach(function (key) {
      var entry = bucket[key];
      if (Array.isArray(entry)) {
        entry.forEach(function (element) { releaseEntry(element, release, errors); });
      } else if (name === "timers" && ID_MAP_KEY.test(key) && isPlainMap(entry) && !isTimerEntry(entry)) {
        Object.keys(entry).forEach(function (mapKey) { releaseEntry(entry[mapKey], release, errors); });
      } else {
        releaseEntry(entry, release, errors);
      }
    });
  }

  /**
   * @param {object} rt  a runtime object holding the standard buckets
   * @returns {Error[]} errors thrown while releasing entries or resetting buckets (empty when clean)
   */
  function disposeRuntimeBuckets(rt) {
    var errors = [];
    if (!rt || typeof rt !== "object") {
      return errors;
    }
    Object.keys(RELEASERS).forEach(function (name) {
      var bucket = rt[name];
      if (Array.isArray(bucket) || isPlainMap(bucket)) {
        drainBucket(name, bucket, errors);
      }
    });
    RUNTIME_BUCKETS.forEach(function (name) {
      try {
        rt[name] = Array.isArray(rt[name]) ? [] : {};
      } catch (error) {
        errors.push(error);
      }
    });
    return errors;
  }

  /**
   * @param {object} listeners  a runtime `listeners` bucket (plain map)
   * @param {string} key
   * @param {EventTarget} target
   * @param {string} type
   * @param {Function} handler
   * @param {boolean|object} [options]
   * @returns {{target: EventTarget, type: string, handler: Function, options: *}}
   */
  function addListener(listeners, key, target, type, handler, options) {
    releaseListener(listeners[key]);
    target.addEventListener(type, handler, options);
    listeners[key] = { target: target, type: type, handler: handler, options: options };
    return listeners[key];
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
    addListener: addListener,
    scheduleTimeout: scheduleTimeout,
    scheduleFrame: scheduleFrame,
    clearTimer: clearTimer,
    cancelTimer: cancelTimer,
    readTabsBusy: readTabsBusy
  };
});
