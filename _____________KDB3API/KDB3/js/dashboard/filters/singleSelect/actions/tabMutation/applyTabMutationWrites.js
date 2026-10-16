define([
  "./guardTabMutation.js",
  "../../effects/writeAndVerifyInstanceSelection.js",
  "../../config/errorCodes.js"
], function (_support, _writeSelection, _codes) {
  "use strict";

  function diagnostic(_code, _message, _record) {
    return {
      code: _code,
      filterInstanceId: _record ? _record.filterInstanceId : undefined,
      message: _message
    };
  }

  async function applyTransfer(_KDB, _runtime, _payload, _snapshot, _pair, _overlays) {
    try {
      if (_support.isStaleRun(_runtime, _payload)) {
        return { ok: false, diagnostics: [diagnostic(_codes.TAB_MUTATION_CANCELLED, "tab mutation run superseded before transfer")] };
      }
      var instances = _KDB.state.filters.singleSelect.instancesById || {};
      var from = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, _pair.from);
      var to = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, _pair.to);
      var diagnostics = [];
      if (from.status !== "ok" || to.status !== "ok") {
        return { ok: false, diagnostics: [diagnostic(_codes.SCOPE_TARGET_UNVERIFIED, "transfer scope is unverified")] };
      }
      var sourceRecords = _support.instancesInScope(instances, from.scopeId);
      for (var i = 0; i < sourceRecords.length; i += 1) {
        var source = sourceRecords[i];
        var sourceSnapshot = _snapshot.byId[source.filterInstanceId];
        var targetMatch = _support.matchTarget(instances, to.scopeId, source);
        if (!sourceSnapshot || targetMatch.status !== "ok") {
          diagnostics.push(diagnostic(_codes.TAB_MUTATION_APPLY_FAILED, "semantic target instance " + targetMatch.status, source));
          continue;
        }
        var targetId = targetMatch.instance.filterInstanceId;
        if (_overlays[targetId]) {
          diagnostics.push(diagnostic(_codes.IDENTITY_COLLISION, "target instance selected more than once", targetMatch.instance));
          continue;
        }
        var written = await _writeSelection(_KDB, _runtime, targetId, sourceSnapshot.hostValues);
        if (_support.isStaleRun(_runtime, _payload)) {
          diagnostics.push(diagnostic(_codes.TAB_MUTATION_CANCELLED, "tab mutation run superseded during transfer", targetMatch.instance));
          break;
        }
        if (!written.ok) {
          diagnostics.push(diagnostic(written.errorCode, "target host write verification failed", targetMatch.instance));
          continue;
        }
        _overlays[targetId] = sourceSnapshot;
      }
      return { ok: diagnostics.length === 0, scopeId: to.scopeId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.applyTabMutationWrites.applyTransfer] failed", error);
      return { ok: false, diagnostics: [diagnostic(_codes.TAB_MUTATION_APPLY_FAILED, String(error && error.message ? error.message : error))] };
    }
  }

  async function clearScope(_KDB, _runtime, _payload, _slot, _clearedIds) {
    try {
      if (_support.isStaleRun(_runtime, _payload)) {
        return { ok: false, diagnostics: [diagnostic(_codes.TAB_MUTATION_CANCELLED, "tab mutation run superseded before clear")] };
      }
      var instances = _KDB.state.filters.singleSelect.instancesById || {};
      var resolved = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, _slot);
      var diagnostics = [];
      if (resolved.status !== "ok") {
        return { ok: false, diagnostics: [diagnostic(_codes.SCOPE_TARGET_UNVERIFIED, "clear scope is unverified")] };
      }
      var records = _support.instancesInScope(instances, resolved.scopeId);
      for (var i = 0; i < records.length; i += 1) {
        var written = await _writeSelection(_KDB, _runtime, records[i].filterInstanceId, []);
        if (_support.isStaleRun(_runtime, _payload)) {
          diagnostics.push(diagnostic(_codes.TAB_MUTATION_CANCELLED, "tab mutation run superseded during clear", records[i]));
          break;
        }
        if (!written.ok) {
          diagnostics.push(diagnostic(written.errorCode, "clear host write verification failed", records[i]));
        } else {
          _clearedIds[records[i].filterInstanceId] = true;
        }
      }
      return { ok: diagnostics.length === 0, scopeId: resolved.scopeId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.applyTabMutationWrites.clearScope] failed", error);
      return { ok: false, diagnostics: [diagnostic(_codes.TAB_MUTATION_APPLY_FAILED, String(error && error.message ? error.message : error))] };
    }
  }

  return {
    applyTransfer: applyTransfer,
    clearScope: clearScope,
    diagnostic: diagnostic
  };
});
