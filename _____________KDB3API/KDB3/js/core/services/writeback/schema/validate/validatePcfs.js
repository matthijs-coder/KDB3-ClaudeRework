define([
  "./validatePrimitives.js"
], function (_primitives) {
  "use strict";

  var pushInvalid = _primitives.pushInvalid;

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  function isTabIdx(value) {
    return typeof value === "number" && isFinite(value) && value >= 0 && Math.floor(value) === value;
  }

  function validateValPair(val, entryIndex, valIndex, diagnostics) {
    if (!val || typeof val !== "object" || Array.isArray(val)) {
      pushInvalid(diagnostics, "filt.pcfs entry vals[" + valIndex + "] must be a plain object { d, u }", { index: entryIndex, valIndex: valIndex, received: val });
      return false;
    }
    var valid = true;
    if (!isNonEmptyString(val.d)) {
      pushInvalid(diagnostics, "filt.pcfs entry vals[" + valIndex + "].d must be a non-empty string", { index: entryIndex, valIndex: valIndex, received: val.d });
      valid = false;
    }
    if (!isNonEmptyString(val.u)) {
      pushInvalid(diagnostics, "filt.pcfs entry vals[" + valIndex + "].u must be a non-empty string", { index: entryIndex, valIndex: valIndex, received: val.u });
      valid = false;
    }
    Object.keys(val).forEach(function (key) {
      if (["d", "u"].indexOf(key) === -1) {
        pushInvalid(diagnostics, "unknown filt.pcfs entry vals field", { index: entryIndex, valIndex: valIndex, field: key });
        valid = false;
      }
    });
    return valid;
  }

  function buildIdentityKey(entry) {
    var nm = typeof entry.nm === "string" ? entry.nm.trim() : "";
    return (entry.tab === undefined ? "global" : String(entry.tab)) + "|" + nm;
  }

  function validatePcfs(pcfs, diagnostics) {
    if (!Array.isArray(pcfs)) {
      pushInvalid(diagnostics, "filt.pcfs must be an array of filter entries", { received: pcfs });
      return;
    }
    var seen = {};
    pcfs.forEach(function (entry, index) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        pushInvalid(diagnostics, "filt.pcfs entry must be a plain object { nm, tab?, vals }", { index: index, received: entry });
        return;
      }
      if (!isNonEmptyString(entry.nm)) {
        pushInvalid(diagnostics, "filt.pcfs entry nm must be a non-empty string", { index: index, received: entry.nm });
      }
      if (entry.tab !== undefined && !isTabIdx(entry.tab)) {
        pushInvalid(diagnostics, "filt.pcfs entry tab must be a non-negative integer tab index", { index: index, received: entry.tab });
      }
      if (!Array.isArray(entry.vals) || entry.vals.length === 0) {
        pushInvalid(diagnostics, "filt.pcfs entry vals must be a non-empty array of { d, u } pairs", { index: index, received: entry.vals });
      } else {
        entry.vals.forEach(function (val, valIndex) {
          validateValPair(val, index, valIndex, diagnostics);
        });
      }
      var identityKey = buildIdentityKey(entry);
      if (seen[identityKey]) {
        pushInvalid(diagnostics, "duplicate filt.pcfs entry identity", { index: index, identity: identityKey });
      } else {
        seen[identityKey] = true;
      }
      Object.keys(entry).forEach(function (key) {
        if (["nm", "tab", "vals"].indexOf(key) === -1) {
          pushInvalid(diagnostics, "unknown filt.pcfs entry field", { index: index, field: key });
        }
      });
    });
  }

  return Object.freeze({ validatePcfs: validatePcfs });
});
