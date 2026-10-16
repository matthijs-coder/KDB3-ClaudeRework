/*
 * kit/data.js: plain-data helpers.
 *
 * cloneJson(value)      Deep copy through a JSON round-trip (see semantics below).
 * isPlainObject(value)  True for {} literals, JSON objects and Object.create(null). False for objects from
 *                       another realm (iframe/window), whose Object.prototype differs.
 * isObjectLike(value)   True for any non-null, non-array object (Dates, class instances, host objects).
 * toArray(value)        New array from an array or array-like (NodeList, HTMLCollection, arguments); else [].
 *
 * cloneJson semantics (one semantics for all former cloneSerializable / JSON.parse(JSON.stringify) copies):
 * - Non-object top-level values (undefined, null, strings, numbers incl. NaN, booleans, functions) are
 *   returned unchanged. A bare JSON.parse(JSON.stringify(undefined)) throws a SyntaxError instead.
 * - Inside objects: undefined and function properties are dropped; undefined/functions in arrays become null;
 *   NaN/Infinity become null; Date becomes its ISO string (also at top level); Map/Set become {};
 *   toJSON() is honoured.
 * - Cycles and BigInt throw a TypeError. The old try/catch variants silently returned the original
 *   (shared) reference or a shallow copy instead; callers that relied on that must decide explicitly.
 */
define([], function () {
  "use strict";

  /**
   * @param {*} value
   * @returns {*} a JSON-faithful deep copy; non-objects are returned as-is
   * @throws {TypeError} on cycles or BigInt values
   */
  function cloneJson(value) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * @param {*} value
   * @returns {boolean} true when the prototype is Object.prototype or null
   */
  function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
      return false;
    }
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /**
   * @param {*} value
   * @returns {boolean} true for any non-null object that is not an array
   */
  function isObjectLike(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * @param {*} value
   * @returns {Array} always a new array
   */
  function toArray(value) {
    if (Array.isArray(value)) {
      return value.slice();
    }
    if (value !== null && typeof value === "object" && typeof value.length === "number") {
      return Array.prototype.slice.call(value);
    }
    return [];
  }

  return {
    cloneJson: cloneJson,
    isPlainObject: isPlainObject,
    isObjectLike: isObjectLike,
    toArray: toArray
  };
});
