define(["./ensureLoadingEntry.js"], function (_ensureLoadingEntry) {
  "use strict";

  function __controller(_KDB, _mountKey) {
    const entry = _ensureLoadingEntry(_KDB, _mountKey);

    entry.activeCount += 1;
    entry.isActive = true;

    return entry;
  }

  return __controller;
});
