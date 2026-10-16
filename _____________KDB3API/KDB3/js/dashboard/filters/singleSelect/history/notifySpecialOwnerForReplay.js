define(["./historyReplayCodes.js"], function (_codes) {
  "use strict";

  // Special owner notification (historyService-filterInstanceIdentity-
  // contractdelta.md §5, amendment 2026-08-10): replaying a step that targets
  // a currently visible specialSingleSelect instance must await
  // `specialSingleSelect/userSelectionCommitted` with `source: "historyReplay"`
  // and `skipHistory: true` after the host commit; a regular (non-special)
  // instance performs no foreign owner notification. "Visible" is derived only
  // through the public `getState()`/`dispatch()` boundary (§9/§13) — no
  // internal specialSingleSelect module is imported.

  function isNegativeAck(_ack) {
    return _ack === false || (_ack && _ack.ok === false) || (_ack && _ack.acknowledged === false);
  }

  function findVisibleSpecialFilterId(_state, _filterLabel) {
    var byFilterId = _state && _state.byFilterId ? _state.byFilterId : {};
    var ids = Object.keys(byFilterId);
    var idx;
    for (idx = 0; idx < ids.length; idx += 1) {
      if (byFilterId[ids[idx]].filterLabel === _filterLabel && byFilterId[ids[idx]].isVisible === true) {
        return ids[idx];
      }
    }
    return null;
  }

  function resolveVisibleSpecialFilterId(_KDB, _filterLabel) {
    var api = _KDB && _KDB.api ? _KDB.api.specialSingleSelect : null;
    if (!api || typeof api.getState !== "function") { return null; }
    try {
      return findVisibleSpecialFilterId(api.getState(), _filterLabel);
    } catch (error) {
      console.error("[singleSelect.notifySpecialOwnerForReplay] getState failed", error);
      return null;
    }
  }

  async function notifySpecialOwnerForReplay(_KDB, _record, _value) {
    var filterId = resolveVisibleSpecialFilterId(_KDB, _record.filterLabel);
    var api;
    var ack;
    if (!filterId) {
      return { ok: true, applicable: false };
    }
    api = _KDB.api.specialSingleSelect;
    if (!api || typeof api.dispatch !== "function") {
      return { ok: false, applicable: true, errorCode: _codes.OWNER_NOTIFY_FAILED };
    }
    try {
      ack = await api.dispatch({
        type: "specialSingleSelect/userSelectionCommitted",
        payload: {
          filterId: filterId,
          filterInstanceId: _record.filterInstanceId,
          filterLabel: _record.filterLabel,
          filterScope: _record.scopeType,
          selection: {
            displayValue: _value.displayValue,
            useValue: _value.useValue,
            displaySource: _value.displaySource || "cognos"
          },
          source: "historyReplay",
          skipHistory: true,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error("[singleSelect.notifySpecialOwnerForReplay] dispatch failed", error);
      return { ok: false, applicable: true, errorCode: _codes.OWNER_NOTIFY_FAILED };
    }
    if (isNegativeAck(ack)) {
      return { ok: false, applicable: true, errorCode: _codes.OWNER_NOTIFY_FAILED };
    }
    return { ok: true, applicable: true };
  }

  return notifySpecialOwnerForReplay;
});
