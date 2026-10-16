define([], function () {
  "use strict";

  function applyChromeCatalog(_KDB, namespace, entries) {
    var selectors;
    var bucket;
    var meta;
    var key;
    var entry;
    try {
      _KDB.elements = _KDB.elements || {};
      _KDB.elements.selectors = _KDB.elements.selectors || {};
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.cognosHost = _KDB.runtime.cognosHost || {};
      _KDB.runtime.cognosHost.selectorMeta = _KDB.runtime.cognosHost.selectorMeta || {};
      selectors = _KDB.elements.selectors;
      bucket = Object.assign({}, selectors[namespace] || {});
      meta = _KDB.runtime.cognosHost.selectorMeta;
      for (key in entries) {
        if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
        entry = entries[key];
        if (!entry || entry.selector == null) continue;
        bucket[key] = entry.selector;
        meta[namespace + "." + key] = {
          required: entry.required === true,
          selector: entry.selector
        };
      }
      selectors[namespace] = bucket;
      return bucket;
    } catch (error) {
      console.error("[cognosHost.applyChromeCatalog] failed", namespace, error);
      throw error;
    }
  }

  return applyChromeCatalog;
});
