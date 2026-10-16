/*
 * kit/errors.js: coded errors and the "called after destroy" guard.
 *
 * codedError(code, message?, extra?)  new Error(message || code) with error.code = code; own enumerable keys
 *                                     of `extra` (e.g. cause, diagnostics) are copied, except code/message/stack.
 *                                     Replaces `throw { code, message }` literals and `err.code = ...` patches.
 *                                     Note: unlike a literal, `message` is not enumerable (JSON.stringify drops it).
 * createDisposedGuard(label)          { isDisposed(), dispose(), blocked(methodName) }.
 *                                     blocked() returns true once disposed and warns
 *                                     "[<label>.<methodName>] called after destroy" once per method name.
 */
define([], function () {
  "use strict";

  var RESERVED_KEYS = { code: true, message: true, stack: true };

  /**
   * @param {string} code
   * @param {string} [message]
   * @param {object} [extra]
   * @returns {Error}
   */
  function codedError(code, message, extra) {
    var error = new Error(message || code);
    error.code = code;
    Object.keys(extra || {}).forEach(function (key) {
      if (!RESERVED_KEYS[key]) {
        error[key] = extra[key];
      }
    });
    return error;
  }

  /**
   * @param {string} label  module name used in the warning, e.g. "sicht"
   * @returns {{isDisposed: function(): boolean, dispose: function(): void, blocked: function(string): boolean}}
   */
  function createDisposedGuard(label) {
    var disposed = false;
    var warned = {};
    return {
      isDisposed: function () {
        return disposed;
      },
      dispose: function () {
        disposed = true;
      },
      blocked: function (methodName) {
        if (!disposed) {
          return false;
        }
        if (!warned[methodName]) {
          warned[methodName] = true;
          console.warn("[" + label + "." + methodName + "] called after destroy");
        }
        return true;
      }
    };
  }

  return {
    codedError: codedError,
    createDisposedGuard: createDisposedGuard
  };
});
