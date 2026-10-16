define(["./ensureLoadingEntry.js"], function (_ensureLoadingEntry) {
  "use strict";

  function __controller(_KDB, _mountKey) {
    const entry = _ensureLoadingEntry(_KDB, _mountKey);

    entry.activeCount = Math.max(0, entry.activeCount - 1);
    if (entry.activeCount === 0) {
      entry.isActive = false;
    }

    return entry;
  }

  return __controller;
});
