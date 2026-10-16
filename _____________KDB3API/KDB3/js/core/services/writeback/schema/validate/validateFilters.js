define([
  "./validatePrimitives.js",
  "./validatePcfs.js",
], function (_primitives, _validatePcfs) {
  "use strict";

  const pushInvalid = _primitives.pushInvalid;
  const isStringArray = _primitives.isStringArray;

  // §4.3: filt.dstl without filt.sicht is invalid (Dienststelle restore needs
  // the active Sicht value).
  function validateFilt(filt, diagnostics) {
    if (filt === undefined) {
      return;
    }
    if (!filt || typeof filt !== "object" || Array.isArray(filt)) {
      pushInvalid(diagnostics, "filt must be a plain object", { received: filt });
      return;
    }
    Object.keys(filt).forEach(function (key) {
      if (["sicht", "dstl", "sels", "pcfs"].indexOf(key) === -1) {
        pushInvalid(diagnostics, "unknown filt field", { field: "filt." + key });
      }
    });
    if (filt.sicht !== undefined && (typeof filt.sicht !== "string" || filt.sicht.trim() === "")) {
      pushInvalid(diagnostics, "filt.sicht must be a non-empty semantic use value", { received: filt.sicht });
    }
    if (filt.dstl !== undefined) {
      if (filt.sicht === undefined) {
        pushInvalid(diagnostics, "filt.dstl requires filt.sicht (Dienststelle restore needs the active Sicht value)", {});
      }
      validateDstl(filt.dstl, diagnostics);
    }
    if (filt.sels !== undefined) {
      validateSels(filt.sels, diagnostics);
    }
    if (filt.pcfs !== undefined) {
      _validatePcfs.validatePcfs(filt.pcfs, diagnostics);
    }
  }

  function validateDstl(dstl, diagnostics) {
    if (!dstl || typeof dstl !== "object" || Array.isArray(dstl)) {
      pushInvalid(diagnostics, "filt.dstl must be a plain object", { received: dstl });
      return;
    }
    if (typeof dstl.key !== "string" || dstl.key.trim() === "") {
      pushInvalid(diagnostics, "filt.dstl.key is required when filt.dstl exists", { received: dstl.key === undefined ? null : dstl.key });
    }
    if (dstl.glob !== undefined && !isStringArray(dstl.glob)) {
      pushInvalid(diagnostics, "filt.dstl.glob must be an array of semantic use values", { received: dstl.glob });
    }
    if (dstl.byTab !== undefined) {
      if (!dstl.byTab || typeof dstl.byTab !== "object" || Array.isArray(dstl.byTab)) {
        pushInvalid(diagnostics, "filt.dstl.byTab must be an object keyed by tab index string", { received: dstl.byTab });
      } else {
        Object.keys(dstl.byTab).forEach(function (tabIdxKey) {
          if (!/^\d+$/.test(tabIdxKey)) {
            pushInvalid(diagnostics, "filt.dstl.byTab keys must be non-negative integer tab index strings", { field: "filt.dstl.byTab." + tabIdxKey });
          }
          if (!isStringArray(dstl.byTab[tabIdxKey])) {
            pushInvalid(diagnostics, "filt.dstl.byTab values must be arrays of semantic use values", { field: "filt.dstl.byTab." + tabIdxKey, received: dstl.byTab[tabIdxKey] });
          }
        });
      }
    }
    Object.keys(dstl).forEach(function (key) {
      if (["key", "glob", "byTab"].indexOf(key) === -1) {
        pushInvalid(diagnostics, "unknown filt.dstl field", { field: "filt.dstl." + key });
      }
    });
  }

  // §4.3 single-select entry: { key, inst?, tab?, vals }; `tab` absent = global,
  // `tab: <n>` = page-scope on tab index n.
  function validateSels(sels, diagnostics) {
    if (!Array.isArray(sels)) {
      pushInvalid(diagnostics, "filt.sels must be an array of filter entries", { received: sels });
      return;
    }
    const seen = {};
    sels.forEach(function (entry, index) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        pushInvalid(diagnostics, "filt.sels entry must be a plain object { key, tab?, vals }", { index: index, received: entry });
        return;
      }
      if (typeof entry.key !== "string" || entry.key.trim() === "") {
        pushInvalid(diagnostics, "filt.sels entry key must be a non-empty semantic key", { index: index, received: entry.key });
      }
      if (entry.inst !== undefined && (typeof entry.inst !== "string" || entry.inst.trim() === "")) {
        pushInvalid(diagnostics, "filt.sels entry inst must be a non-empty semantic instance key when present", { index: index, received: entry.inst });
      }
      if (entry.tab !== undefined && (typeof entry.tab !== "number" || !isFinite(entry.tab) || entry.tab < 0 || Math.floor(entry.tab) !== entry.tab)) {
        pushInvalid(diagnostics, "filt.sels entry tab must be a non-negative integer tab index when present", { index: index, received: entry.tab });
      }
      if (!isStringArray(entry.vals) || entry.vals.length === 0) {
        pushInvalid(diagnostics, "filt.sels entry vals must be a non-empty array of use values", { index: index, received: entry.vals });
      }
      const identityKey = buildSelsIdentityKey(entry);
      if (seen[identityKey]) {
        pushInvalid(diagnostics, "duplicate filt.sels entry identity", { index: index, identity: identityKey });
      } else {
        seen[identityKey] = true;
      }
      Object.keys(entry).forEach(function (key) {
        if (["key", "inst", "tab", "vals"].indexOf(key) === -1) {
          pushInvalid(diagnostics, "unknown filt.sels entry field", { index: index, field: key });
        }
      });
    });
  }

  function buildSelsIdentityKey(entry) {
    const key = typeof entry.key === "string" ? entry.key.trim() : "";
    const tab = entry.tab === undefined ? "global" : String(entry.tab);
    const inst = entry.inst !== undefined ? String(entry.inst).trim() : "";
    return tab + "|" + key + "|" + inst;
  }

  return Object.freeze({
    validateFilt: validateFilt,
  });
});
