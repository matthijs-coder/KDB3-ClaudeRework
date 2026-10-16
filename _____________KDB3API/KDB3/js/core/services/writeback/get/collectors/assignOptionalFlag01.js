define([], function () {
  "use strict";

  function assignOptionalFlag01(target, compactKey, value) {
    if (typeof value !== "boolean") {
      return;
    }
    target[compactKey] = value ? 1 : 0;
  }

  return assignOptionalFlag01;
});
