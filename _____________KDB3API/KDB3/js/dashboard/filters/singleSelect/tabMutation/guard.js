define([
  "../../../../core/utils/filters/tabMutationRun/guardTabMutationRun.js",
  "../../../../core/utils/normalizeCognosScopeId.js"
], function (_guardRunUtil, _normalizeScopeId) {
  "use strict";

  var SS_GUARD_OPTS = {
    pinOperationId: true,
    ensureRunIdDefault0: false,
    includeRunIdsInDiagnostic: false,
    missingIdsMessage: "tab mutation requires numeric runId and operationId",
    supersededMessage: "tab mutation run was superseded",
    operationMismatchMessage: "operationId does not match the active tab mutation run"
  };

  function guardRun(_runtime, _payload) {
    return _guardRunUtil.guardRun(_runtime, _payload, SS_GUARD_OPTS);
  }

  function cancelled(_message) {
    return _guardRunUtil.cancelled(_message, null, null, SS_GUARD_OPTS);
  }

  function isStaleRun(_runtime, _payload) {
    return _guardRunUtil.isStale(_runtime, _payload, { staleMode: "ss" });
  }

  function diagnostic(_code, _message, _record) {
    return {
      code: _code,
      filterInstanceId: _record ? _record.filterInstanceId : undefined,
      message: _message
    };
  }

  function readScopeValue(_value) {
    if (typeof _value === "string") { return _value; }
    return _value && _value.scopeId ? String(_value.scopeId) : null;
  }

  function scopeBySlot(_targets, _slot) {
    var matches = [];
    if (_slot.tabIdx != null) {
      var byTabIdx = readScopeValue(_targets && _targets[String(_slot.tabIdx)]);
      if (byTabIdx) { matches.push(byTabIdx); }
    }
    if (matches.length === 0 && _slot.index != null) {
      var byIndex = readScopeValue(_targets && _targets[String(_slot.index)]);
      if (byIndex) { matches.push(byIndex); }
    }
    if (matches.length === 0 && _slot.tabId) {
      Object.keys(_targets || {}).forEach(function (_tabIdx) {
        var target = _targets[_tabIdx];
        if (target && typeof target === "object" && target.tabId === _slot.tabId && target.scopeId) {
          matches.push(String(target.scopeId));
        }
      });
    }
    return matches.length === 1 ? { status: "ok", scopeId: matches[0] } : {
      status: matches.length > 1 ? "ambiguous" : "missing",
      scopeId: null
    };
  }

  function verifyScope(_instances, _scopeId) {
    var wanted = _normalizeScopeId(_scopeId);
    return Object.keys(_instances || {}).some(function (_id) {
      var record = _instances[_id];
      return record && record.scopeType === "pageContext" &&
        record.hostStatus === "present" && _normalizeScopeId(record.scopeId) === wanted;
    });
  }

  function resolveScope(_instances, _targets, _slot) {
    var resolved = scopeBySlot(_targets, _slot || {});
    if (resolved.status !== "ok" || !verifyScope(_instances, resolved.scopeId)) {
      return { status: "unverified", scopeId: null };
    }
    return resolved;
  }

  function semanticKey(_record) {
    return [
      _record.filterType,
      _record.filterLabel,
      _record.semanticInstanceKey || "",
      _record.itemName || ""
    ].join("|");
  }

  function instancesInScope(_instances, _scopeId) {
    var wanted = _normalizeScopeId(_scopeId);
    return Object.keys(_instances || {}).map(function (_id) {
      return _instances[_id];
    }).filter(function (_record) {
      return _record && _record.scopeType === "pageContext" &&
        _record.selectionOwner === "singleSelect" &&
        _record.status === "active" && _record.hostStatus === "present" &&
        _normalizeScopeId(_record.scopeId) === wanted;
    });
  }

  function matchTarget(_instances, _scopeId, _sourceRecord) {
    var key = semanticKey(_sourceRecord);
    var matches = instancesInScope(_instances, _scopeId).filter(function (_record) {
      return semanticKey(_record) === key;
    });
    return {
      status: matches.length === 1 ? "ok" : (matches.length > 1 ? "ambiguous" : "missing"),
      instance: matches.length === 1 ? matches[0] : null
    };
  }

  function cloneSelection(_selection) {
    return _selection ? Object.assign({}, _selection) : null;
  }

  function isLiveSnapshotMatch(_record, _snapshotRecord) {
    return _record && _record.status === "active" &&
      _record.hostStatus === "present" &&
      _normalizeScopeId(_record.scopeId) === _normalizeScopeId(_snapshotRecord.scopeId) &&
      semanticKey(_record) === _snapshotRecord.semanticKey;
  }

  function matchSnapshotTarget(_instances, _snapshotRecord) {
    var byId = _instances && _snapshotRecord
      ? _instances[_snapshotRecord.filterInstanceId] : null;
    if (isLiveSnapshotMatch(byId, _snapshotRecord)) {
      return { status: "ok", instance: byId };
    }
    var matches = Object.keys(_instances || {}).map(function (_id) {
      return _instances[_id];
    }).filter(function (_record) {
      return isLiveSnapshotMatch(_record, _snapshotRecord);
    });
    if (matches.length !== 1) {
      return { status: matches.length > 1 ? "ambiguous" : "missing", instance: null };
    }
    return { status: "ok", instance: matches[0] };
  }

  function cloneSnapshotRecord(_record, _hostValues) {
    return {
      filterInstanceId: _record.filterInstanceId,
      scopeId: _record.scopeId,
      semanticKey: semanticKey(_record),
      currentSelection: cloneSelection(_record.currentSelection),
      backupSelection: cloneSelection(_record.backupSelection),
      pendingSelection: cloneSelection(_record.pendingSelection),
      hostValues: Array.isArray(_hostValues) ? _hostValues.map(function (_value) {
        return { d: _value.d, u: _value.u };
      }) : []
    };
  }

  return {
    guardRun: guardRun,
    cancelled: cancelled,
    isStaleRun: isStaleRun,
    resolveScope: resolveScope,
    diagnostic: diagnostic,
    semanticKey: semanticKey,
    instancesInScope: instancesInScope,
    matchTarget: matchTarget,
    matchSnapshotTarget: matchSnapshotTarget,
    cloneSnapshotRecord: cloneSnapshotRecord
  };
});
