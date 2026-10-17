/*
 * kit/history.js: thin owner-side wrappers over `_KDB.services.history`. Step keys, step shapes and the
 * historyService itself are unchanged. Each owner registers its own replay handler with the history service
 * (registerReplayKeys) where it creates it: in register, or in mount when the handler needs the mounted state.
 *
 * pushHistoryStep(_KDB, step, options?)  boolean. Returns false without pushing when options.isHistoryReplay
 *                                        or options.skipHistory is true, or when the history service is missing;
 *                                        otherwise returns pushCommittedStep(step) === true.
 *                                        step = { key, old, new, timestamp? }.
 *   pushCommittedStep already: clones old/new through JSON, keeps only key/timestamp/old/new, defaults the
 *   timestamp, rejects steps whose old equals new, and rejects steps while a writeback restore is active.
 *   Owners that adopt this helper can drop their local cloneSerializable, areSnapshotsEqual and
 *   runtime.history.writebackRestore checks.
 * registerReplayKeys(_KDB, keys, handler)
 *                                        Registers `handler` under every step key of `keys` with
 *                                        services.history.registerReplayHandler and returns one function that
 *                                        unregisters them all. A missing history service is a silent no-op like in
 *                                        pushHistoryStep (registerServices always registers it). The history
 *                                        service looks handlers up by key, so registration order does not matter;
 *                                        its destroy clears them.
 * createReplayHandler(applyByKey)        { apply(_KDB, targetValue, step, ctx) } for a contribution object.
 *                                        Calls applyByKey[step.key](_KDB, targetValue, step, ctx) and returns its
 *                                        result (boolean or Promise<boolean>); unknown keys return false.
 */
define([], function () {
  "use strict";

  /**
   * @param {object} _KDB
   * @param {{key: string, old: object|null, new: object|null, timestamp?: number}} step
   * @param {{isHistoryReplay?: boolean, skipHistory?: boolean}} [options]
   * @returns {boolean} true when the history service accepted the step
   */
  function pushHistoryStep(_KDB, step, options) {
    var opts = options || {};
    if (opts.isHistoryReplay === true || opts.skipHistory === true) {
      return false;
    }
    var history = _KDB && _KDB.services && _KDB.services.history;
    if (!history || typeof history.pushCommittedStep !== "function") {
      return false;
    }
    return history.pushCommittedStep(step) === true;
  }

  /**
   * @param {Object<string, Function>} applyByKey  step key -> apply(_KDB, targetValue, step, ctx)
   * @returns {{apply: Function}}
   */
  function createReplayHandler(applyByKey) {
    return {
      apply: function (_KDB, targetValue, step, ctx) {
        var key = step && step.key;
        var apply = typeof key === "string" && Object.prototype.hasOwnProperty.call(applyByKey, key) ? applyByKey[key] : null;
        return typeof apply === "function" ? apply(_KDB, targetValue, step, ctx) : false;
      }
    };
  }

  /**
   * @param {object} _KDB
   * @param {string[]} keys   step keys the handler replays
   * @param {{apply: Function}} handler
   * @returns {Function} unregisters every key registered here
   */
  function registerReplayKeys(_KDB, keys, handler) {
    var history = _KDB && _KDB.services && _KDB.services.history;
    var unregisters;
    if (!history || typeof history.registerReplayHandler !== "function") {
      return function () {};
    }
    unregisters = keys.map(function (key) {
      return history.registerReplayHandler(key, handler);
    });
    return function unregisterReplayKeys() {
      unregisters.forEach(function (unregister) {
        if (typeof unregister === "function") {
          unregister();
        }
      });
    };
  }

  return {
    pushHistoryStep: pushHistoryStep,
    createReplayHandler: createReplayHandler,
    registerReplayKeys: registerReplayKeys
  };
});
