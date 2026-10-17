define([
  "../v3Defaults.js",
  "./validatePrimitives.js",
], function (_v3Defaults, _primitives) {
  "use strict";

  const pushInvalid = _primitives.pushInvalid;

  // §4.2: head.title / head.sub / head.subOn / head.icon without head.on is invalid;
  // present head.icon must be a string (unknown stems are owner-classified).
  function validateHead(head, diagnostics) {
    if (head === undefined) {
      return;
    }
    if (!head || typeof head !== "object" || Array.isArray(head)) {
      pushInvalid(diagnostics, "head must be a plain object", { received: head });
      return;
    }
    if (head.on !== 0 && head.on !== 1) {
      pushInvalid(diagnostics, "head requires on: 0|1; head fields without head.on are invalid", { received: head.on === undefined ? null : head.on });
    }
    if (head.subOn !== undefined && head.subOn !== 0 && head.subOn !== 1) {
      pushInvalid(diagnostics, "head.subOn must be 0 or 1", { received: head.subOn });
    }
    if (head.title !== undefined && typeof head.title !== "string") {
      pushInvalid(diagnostics, "head.title must be a string", { received: head.title });
    }
    if (head.sub !== undefined && typeof head.sub !== "string") {
      pushInvalid(diagnostics, "head.sub must be a string", { received: head.sub });
    }
    if (head.icon !== undefined && typeof head.icon !== "string") {
      pushInvalid(diagnostics, "head.icon must be a string", { received: head.icon });
    }
    Object.keys(head).forEach(function (key) {
      if (_v3Defaults.HEAD_KEYS.indexOf(key) === -1) {
        pushInvalid(diagnostics, "unknown head field", { field: "head." + key });
      }
    });
  }

  function validateFoot(foot, diagnostics) {
    if (foot === undefined) {
      return;
    }
    if (!foot || typeof foot !== "object" || Array.isArray(foot)) {
      pushInvalid(diagnostics, "foot must be a plain object", { received: foot });
      return;
    }
    if (foot.on !== 0 && foot.on !== 1) {
      pushInvalid(diagnostics, "foot requires on: 0|1", { received: foot.on === undefined ? null : foot.on });
    }
    Object.keys(foot).forEach(function (key) {
      if (_v3Defaults.FOOT_KEYS.indexOf(key) === -1) {
        pushInvalid(diagnostics, "unknown foot field", { field: "foot." + key });
      }
    });
  }

  return Object.freeze({
    validateHead: validateHead,
    validateFoot: validateFoot,
  });
});
