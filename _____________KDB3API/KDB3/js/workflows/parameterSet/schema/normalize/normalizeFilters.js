define([
  "../v3Defaults.js",
  "../../../../core/config/writebackErrorCodes.js",
  "./normalizePcfs.js",
], function (_v3Defaults, _errorCodes, _normalizePcfs) {
  "use strict";

  // filt normalization (§4.3/§4.7). Wrong types are preserved for validateV3.

  function normalizeFilt(filt, diagnostics) {
    if (!filt || typeof filt !== "object" || Array.isArray(filt)) {
      return filt === undefined || filt === null ? null : filt;
    }
    const normalized = {};
    if (!_v3Defaults.isOmissionSentinel(filt.sicht)) {
      normalized.sicht = typeof filt.sicht === "string" ? filt.sicht.trim() : filt.sicht;
    }
    const dstl = normalizeDstl(filt.dstl);
    if (dstl !== null) {
      normalized.dstl = dstl;
    }
    const sels = normalizeSels(filt.sels, diagnostics);
    if (sels !== null) {
      normalized.sels = sels;
    }
    const pcfs = _normalizePcfs(filt.pcfs, diagnostics);
    if (pcfs !== null) {
      normalized.pcfs = pcfs;
    }
    Object.keys(filt).forEach(function (key) {
      if (["sicht", "dstl", "sels", "pcfs"].indexOf(key) === -1) {
        normalized[key] = filt[key];
      }
    });
    return Object.keys(normalized).length === 0 ? null : normalized;
  }

  function normalizeDstl(dstl) {
    if (!dstl || typeof dstl !== "object" || Array.isArray(dstl)) {
      return dstl === undefined || dstl === null ? null : dstl;
    }
    const normalized = {};
    if (!_v3Defaults.isOmissionSentinel(dstl.key)) {
      normalized.key = dstl.key;
    }
    if (Array.isArray(dstl.glob) && dstl.glob.length > 0) {
      normalized.glob = dstl.glob.slice();
    } else if (dstl.glob !== undefined && dstl.glob !== null && !Array.isArray(dstl.glob)) {
      normalized.glob = dstl.glob;
    }
    if (dstl.byTab && typeof dstl.byTab === "object" && !Array.isArray(dstl.byTab)) {
      const byTab = {};
      Object.keys(dstl.byTab).forEach(function (tabIdxKey) {
        const values = dstl.byTab[tabIdxKey];
        if (Array.isArray(values) && values.length > 0) {
          byTab[tabIdxKey] = values.slice();
        } else if (values !== undefined && values !== null && !Array.isArray(values)) {
          byTab[tabIdxKey] = values;
        }
        // empty scopes are omitted (§4.7)
      });
      if (Object.keys(byTab).length > 0) {
        normalized.byTab = byTab;
      }
    } else if (dstl.byTab !== undefined && dstl.byTab !== null) {
      normalized.byTab = dstl.byTab;
    }
    Object.keys(dstl).forEach(function (key) {
      if (["key", "glob", "byTab"].indexOf(key) === -1) {
        normalized[key] = dstl[key];
      }
    });
    return Object.keys(normalized).length === 0 ? null : normalized;
  }

  // sels entries are { key, inst?, tab?, vals } objects; `tab` absent = global scope.
  function normalizeSels(sels, diagnostics) {
    if (!Array.isArray(sels)) {
      return sels === undefined || sels === null ? null : sels;
    }
    const normalized = [];
    sels.forEach(function (entry) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        normalized.push(entry); // preserved for validateV3
        return;
      }
      if (Array.isArray(entry.vals) && entry.vals.length === 0) {
        if (diagnostics) {
          diagnostics.push(_errorCodes.makeDiagnostic(
            _errorCodes.codes.WRITEBACK_FILTER_KIND_UNSUPPORTED,
            "validate",
            "empty single-select filter entry omitted during normalization",
            { filterKey: entry.key, tab: entry.tab === undefined ? null : entry.tab }
          ));
        }
        return;
      }
      const clone = {};
      Object.keys(entry).forEach(function (key) {
        if (key === "inst") {
          return;
        }
        clone[key] = key === "vals" && Array.isArray(entry.vals) ? entry.vals.slice() : entry[key];
      });
      const normalizedInst = normalizeSemanticInstanceKey(entry.inst);
      if (normalizedInst !== null) {
        clone.inst = normalizedInst;
      }
      normalized.push(clone);
    });
    return normalized.length === 0 ? null : normalized;
  }

  function normalizeSemanticInstanceKey(rawInst) {
    if (typeof rawInst !== "string") return null;
    const trimmed = rawInst.trim();
    return trimmed !== "" ? trimmed : null;
  }

  return normalizeFilt;
});
