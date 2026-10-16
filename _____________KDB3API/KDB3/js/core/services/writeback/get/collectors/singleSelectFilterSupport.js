define([], function () {
  "use strict";

  function trimUseValue(selection) {
    return selection && typeof selection.useValue === "string" ? selection.useValue.trim() : "";
  }

  function isKnownUnsupportedKey(rawKey) {
    const key = String(rawKey == null ? "" : rawKey).trim().toLowerCase();
    return key === "sicht" || key === "dienststelle" || key === "dienststelle_bw" || key === "dienststelle_dezpv";
  }

  return Object.freeze({
    trimUseValue: trimUseValue,
    isKnownUnsupportedKey: isKnownUnsupportedKey,
  });
});
