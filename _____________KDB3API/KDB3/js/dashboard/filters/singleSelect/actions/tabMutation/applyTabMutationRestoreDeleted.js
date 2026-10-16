define([
  "./guardTabMutation.js",
  "../../hostFilterIo.js",
  "../../config.js"
], function (_support, _hostFilterIo, _config) {
  "use strict";

  function diagnostic(_code, _message, _record) {
    return {
      code: _code,
      filterInstanceId: _record ? _record.filterInstanceId : undefined,
      message: _message
    };
  }

  function semanticKey(_record) {
    return [
      _record.filterType,
      _record.filterLabel,
      _record.semanticInstanceKey || "",
      _record.itemName || ""
    ].join("|");
  }

  function matchBySemanticKey(_instances, _scopeId, _snapshotRecord) {
    var wanted = _snapshotRecord && _snapshotRecord.semanticKey;
    var matches = _support.instancesInScope(_instances, _scopeId).filter(function (_record) {
      return semanticKey(_record) === wanted;
    });
    return {
      status: matches.length === 1 ? "ok" : (matches.length > 1 ? "ambiguous" : "missing"),
      instance: matches.length === 1 ? matches[0] : null
    };
  }

  async function writeRestoreSlice(_KDB, _runtime, _payload, _overlays) {
    try {
      var plan = _payload.plan || {};
      var restore = plan.restore && plan.restore.filters && plan.restore.filters.singleSelect || {};
      var instances = _KDB.state.filters.singleSelect.instancesById || {};
      var insert = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, plan.insertSlot || {});
      var diagnostics = [];
      var keys = Object.keys(restore);
      var i;
      if (insert.status !== "ok") {
        return { ok: false, diagnostics: [diagnostic(_config.errorCodes.SCOPE_TARGET_UNVERIFIED, "restore insert scope is unverified")] };
      }
      for (i = 0; i < keys.length; i += 1) {
        if (_support.isStaleRun(_runtime, _payload)) {
          return { ok: false, diagnostics: [diagnostic(_config.errorCodes.TAB_MUTATION_CANCELLED, "tab mutation run superseded before restore write")] };
        }
        var sourceSnapshot = restore[keys[i]];
        var targetMatch = matchBySemanticKey(instances, insert.scopeId, sourceSnapshot);
        if (!sourceSnapshot || targetMatch.status !== "ok") {
          diagnostics.push(diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, "semantic restore target " + (targetMatch.status || "missing"), sourceSnapshot));
          continue;
        }
        var targetId = targetMatch.instance.filterInstanceId;
        if (_overlays[targetId]) {
          diagnostics.push(diagnostic(_config.errorCodes.IDENTITY_COLLISION, "target instance selected more than once", targetMatch.instance));
          continue;
        }
        var written = await _hostFilterIo.writeInstanceSelection(_KDB, _runtime, targetId, sourceSnapshot.hostValues);
        if (_support.isStaleRun(_runtime, _payload)) {
          diagnostics.push(diagnostic(_config.errorCodes.TAB_MUTATION_CANCELLED, "tab mutation run superseded during restore write", targetMatch.instance));
          break;
        }
        if (!written.ok) {
          diagnostics.push(diagnostic(written.errorCode, "restore host write verification failed", targetMatch.instance));
          continue;
        }
        _overlays[targetId] = sourceSnapshot;
      }
      return { ok: diagnostics.length === 0, scopeId: insert.scopeId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.applyTabMutationRestoreDeleted] failed", error);
      return { ok: false, diagnostics: [diagnostic(_config.errorCodes.TAB_MUTATION_APPLY_FAILED, String(error && error.message ? error.message : error))] };
    }
  }

  return { writeRestoreSlice: writeRestoreSlice };
});
