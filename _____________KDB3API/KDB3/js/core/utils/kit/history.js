/*
 * kit/history.js: thin owner-side wrappers over `_KDB.services.history`. Step keys, step shapes and the
 * historyService itself are unchanged; replay handlers are registered through
 * `services.history.registerReplayHandler` (the manifest in core/bootstrap collects each owner's
 * runtime.<owner>.historyReplayHandlerContribution).
 *
 * pushHistoryStep(_KDB, step, options?)  boolean. Returns false without pushing when options.isHistoryReplay
 *                                        or options.skipHistory is true, or when the history service is missing;
 *                                        otherwise returns pushCommittedStep(step) === true.
 *                                        step = { key, old, new, timestamp? }.
 *   pushCommittedStep already: clones old/new through JSON, keeps only key/timestamp/old/new, defaults the
 *   timestamp, rejects steps whose old equals new, and rejects steps while a writeback restore is active.
 *   Owners that adopt this helper can drop their local cloneSerializable, areSnapshotsEqual and
 *   runtime.history.writebackRestore checks.
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

  return {
    pushHistoryStep: pushHistoryStep,
    createReplayHandler: createReplayHandler
  };
});
