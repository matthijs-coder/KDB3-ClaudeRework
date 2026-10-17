define([
  "../../../../core/config/writebackErrorCodes.js",
], function (_errorCodes) {
  "use strict";

  function materializeSingleSelectEntries(_pendingEntries, _diagnostics) {
    const byBucket = {};
    _pendingEntries.forEach(function (entry) {
      const scopeBucket = entry.tab === undefined ? "global" : "tab:" + String(entry.tab);
      const bucketKey = scopeBucket + "|" + entry.key;
      byBucket[bucketKey] = byBucket[bucketKey] || [];
      byBucket[bucketKey].push(entry);
    });

    const out = [];
    Object.keys(byBucket).forEach(function (bucketKey) {
      const bucket = byBucket[bucketKey];
      if (bucket.length === 1) {
        out.push(toPersistedEntry(bucket[0], shouldEmitExplicitInst(bucket[0]) ? bucket[0].instCandidate : null));
        return;
      }
      if (!hasUniqueSemanticKeys(bucket)) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SINGLESELECT_INSTANCE_KEY_MISSING,
          "get",
          "same key/scope singleSelect entries are ambiguous without unique semantic keys",
          { key: bucket[0].key, tab: bucket[0].tab === undefined ? null : bucket[0].tab }
        ));
        return;
      }
      bucket.forEach(function (entry) { out.push(toPersistedEntry(entry, entry.instCandidate)); });
    });

    out.sort(compareEntries);
    return out;
  }

  function hasUniqueSemanticKeys(bucket) {
    const seen = {};
    for (let index = 0; index < bucket.length; index += 1) {
      const key = bucket[index].instCandidate;
      if (!key || seen[key]) return false;
      seen[key] = true;
    }
    return true;
  }

  function shouldEmitExplicitInst(entry) {
    return !!(entry.instCandidate && entry.instCandidate !== entry.defaultSemanticKey);
  }

  function toPersistedEntry(entry, inst) {
    const persisted = { key: entry.key, vals: entry.vals.slice() };
    if (entry.tab !== undefined) persisted.tab = entry.tab;
    if (inst) persisted.inst = inst;
    return persisted;
  }

  function compareEntries(left, right) {
    const scopeOrder = (left.tab === undefined ? 0 : 1) - (right.tab === undefined ? 0 : 1);
    if (scopeOrder !== 0) return scopeOrder;
    const leftTab = left.tab === undefined ? -1 : Number(left.tab);
    const rightTab = right.tab === undefined ? -1 : Number(right.tab);
    if (leftTab !== rightTab) return leftTab - rightTab;
    const keyOrder = String(left.key || "").localeCompare(String(right.key || ""));
    if (keyOrder !== 0) return keyOrder;
    return String(left.inst || "").localeCompare(String(right.inst || ""));
  }

  return materializeSingleSelectEntries;
});
