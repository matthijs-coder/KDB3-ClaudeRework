define([
  "../../../../core/config/writebackErrorCodes.js"
], function (_errorCodes) {
  "use strict";

  function isNonEmptyPair(pair) {
    var d = String(pair.d == null ? "" : pair.d).trim();
    var u = String(pair.u == null ? "" : pair.u).trim();
    return d !== "" && u !== "";
  }

  function normalizeVals(vals) {
    var normalized = [];
    var idx;
    for (idx = 0; idx < vals.length; idx += 1) {
      var pair = vals[idx];
      if (!pair || typeof pair !== "object" || Array.isArray(pair)) { continue; }
      var d = typeof pair.d === "string" ? pair.d.trim() : pair.d;
      var u = typeof pair.u === "string" ? pair.u.trim() : pair.u;
      if (isNonEmptyPair({ d: d, u: u })) {
        normalized.push({ d: String(d), u: String(u) });
      }
    }
    return normalized;
  }

  function normalizePcfs(pcfs, diagnostics) {
    if (!Array.isArray(pcfs)) {
      return pcfs === undefined || pcfs === null ? null : pcfs;
    }
    var normalized = [];
    pcfs.forEach(function (entry) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        normalized.push(entry);
        return;
      }
      var clone = {};
      Object.keys(entry).forEach(function (key) {
        if (key === "vals" && Array.isArray(entry.vals)) {
          clone.vals = normalizeVals(entry.vals);
        } else if (key === "nm" && typeof entry.nm === "string") {
          clone.nm = entry.nm.trim();
        } else {
          clone[key] = entry[key];
        }
      });
      if (Array.isArray(clone.vals) && clone.vals.length === 0) {
        if (diagnostics) {
          diagnostics.push(_errorCodes.makeDiagnostic(
            _errorCodes.codes.WRITEBACK_FILTER_KIND_UNSUPPORTED,
            "validate",
            "empty page-context-plain filter entry omitted during normalization",
            { nm: entry.nm, tab: entry.tab === undefined ? null : entry.tab }
          ));
        }
        return;
      }
      normalized.push(clone);
    });
    return normalized.length === 0 ? null : normalized;
  }

  return normalizePcfs;
});
