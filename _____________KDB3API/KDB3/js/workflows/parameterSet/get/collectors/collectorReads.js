define([
  "../../../../core/utils/tabSlots.js",
], function (_tabSlots) {
  "use strict";

  function trimUseValue(selection) {
    return selection && typeof selection.useValue === "string" ? selection.useValue.trim() : "";
  }

  function isKnownUnsupportedKey(rawKey) {
    const key = String(rawKey == null ? "" : rawKey).trim().toLowerCase();
    return key === "sicht" || key === "dienststelle" || key === "dienststelle_bw" || key === "dienststelle_dezpv";
  }

  function readApiState(_KDB, owner) {
    const api = _KDB && _KDB.api ? _KDB.api[owner] : null;
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  return Object.freeze({
    trimUseValue: trimUseValue,
    isKnownUnsupportedKey: isKnownUnsupportedKey,
    isDashboardTab: _tabSlots.isDashboardTab,
    readApiState: readApiState,
  });
});
