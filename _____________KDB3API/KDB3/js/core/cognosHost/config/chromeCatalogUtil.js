define([], function () {
  "use strict";

  function req(selector) {
    return { selector: selector, required: true };
  }

  function opt(selector) {
    return { selector: selector, required: false };
  }

  function stringsFromEntries(entries) {
    var out = {};
    var key;
    var entry;
    try {
      for (key in entries) {
        if (!Object.prototype.hasOwnProperty.call(entries, key)) continue;
        entry = entries[key];
        if (entry && entry.selector != null) {
          out[key] = entry.selector;
        }
      }
      return out;
    } catch (error) {
      console.error("[cognosHost.chromeCatalogUtil] stringsFromEntries failed", error);
      throw error;
    }
  }

  return {
    req: req,
    opt: opt,
    stringsFromEntries: stringsFromEntries
  };
});
