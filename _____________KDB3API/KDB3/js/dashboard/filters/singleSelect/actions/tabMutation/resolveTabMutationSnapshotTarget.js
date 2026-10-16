define([
  "../../../../../core/utils/normalizeCognosScopeId.js"
], function (_normalizeScopeId) {
  "use strict";

  function semanticKey(_record) {
    return [
      _record.filterType,
      _record.filterLabel,
      _record.semanticInstanceKey || "",
      _record.itemName || ""
    ].join("|");
  }

  function isLiveMatch(_record, _snapshotRecord) {
    return _record && _record.status === "active" &&
      _record.hostStatus === "present" &&
      _normalizeScopeId(_record.scopeId) === _normalizeScopeId(_snapshotRecord.scopeId) &&
      semanticKey(_record) === _snapshotRecord.semanticKey;
  }

  function __controller(_instances, _snapshotRecord) {
    try {
      var byId = _instances && _snapshotRecord
        ? _instances[_snapshotRecord.filterInstanceId] : null;
      if (isLiveMatch(byId, _snapshotRecord)) {
        return { status: "ok", instance: byId };
      }
      var matches = Object.keys(_instances || {}).map(function (_id) {
        return _instances[_id];
      }).filter(function (_record) {
        return isLiveMatch(_record, _snapshotRecord);
      });
      if (matches.length !== 1) {
        return { status: matches.length > 1 ? "ambiguous" : "missing", instance: null };
      }
      return { status: "ok", instance: matches[0] };
    } catch (error) {
      console.error("[singleSelect.resolveTabMutationSnapshotTarget] failed", error);
      throw error;
    }
  }

  return __controller;
});
