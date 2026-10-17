define([
  "../config.js",
  "../hostFilterIo.js",
  "../runtime.js",
  "./ownerNotify.js"
], function (_config, _hostFilterIo, _singleSelectRuntime, _ownerNotify) {
  "use strict";

  var codes = _config.errorCodes;

  function failureResult(_code, _message) {
    return { ok: false, degraded: false, code: _code, message: _message };
  }

  async function notifySichtOwner(_KDB, _handoff, _selection) {
    try {
      var api = _KDB && _KDB.api && _KDB.api.sicht ? _KDB.api.sicht : null;
      if (!api) {
        return failureResult(codes.OWNER_SELECTION_INVALID, "sicht owner dispatch API unavailable");
      }
      var ack = await api.dispatch({
        type: _ownerNotify.ownerActions.sichtCommitted,
        payload: {
          filterInstanceId: _handoff.filterInstanceId || null,
          filterLabel: _handoff.filterLabel || null,
          filterScope: _handoff.filterScope || null,
          selection: {
            displayValue: _selection.displayValue,
            useValue: _selection.useValue,
            displaySource: _selection.displaySource || "cognos"
          },
          operationId: _handoff.operationId || null,
          source: _handoff.source || "parameterRestore",
          skipHistory: _handoff.skipHistory === true,
          timestamp: Date.now()
        }
      });
      if (_ownerNotify.isNegativeAck(ack)) {
        return failureResult(
          codes.OWNER_SELECTION_INVALID,
          "sicht owner rejected delegated singleSelect commit notification"
        );
      }
      return { ok: true };
    } catch (error) {
      return failureResult(
        codes.OWNER_SELECTION_INVALID,
        "sicht owner dispatch failed: " + String(error && error.message ? error.message : error)
      );
    }
  }

  function success(_id) {
    return {
      ok: true,
      degraded: false,
      applied: [{ filterInstanceId: _id, ok: true, degraded: false }],
      diagnostics: []
    };
  }

  function failure(_id, _code, _message, _degraded) {
    return {
      ok: false,
      degraded: _degraded === true,
      applied: [{
        filterInstanceId: _id,
        ok: false,
        degraded: _degraded === true,
        errorCode: _code
      }],
      diagnostics: [{ code: _code, filterInstanceId: _id, message: _message }]
    };
  }

  async function applyOwnerSelection(_KDB, _runtime, _payload) {
    var payload = _payload || {};
    var id = payload.filterInstanceId;
    try {
      var operationId = payload.operationId ? String(payload.operationId) : "";
      var seenOps = _runtime.delegatedOperationIds = _runtime.delegatedOperationIds || {};
      if (!operationId || payload.notifyOwner !== "sicht" || payload.skipHistory !== true) {
        return failure(id, codes.OWNER_SELECTION_INVALID, "operationId, notifyOwner sicht and skipHistory true are required");
      }
      if (!payload.selection || payload.selection.displayValue == null ||
        payload.selection.useValue == null) {
        return failure(id, codes.OWNER_SELECTION_INVALID, "selection requires independent display/use values");
      }
      if (seenOps[operationId] && seenOps[operationId] !== id) {
        return failure(id, codes.OWNER_SELECTION_INVALID, "operationId was reused for another filter instance");
      }
      if (seenOps[operationId] === id) {
        return success(id);
      }
      var root = _KDB.state.filters.singleSelect;
      var record = root.instancesById ? root.instancesById[id] : null;
      if (!record || record.selectionOwner !== "sicht" ||
        record.status !== "active" || record.hostStatus !== "present") {
        return failure(id, codes.INSTANCE_NOT_FOUND, "writable delegated Sicht descriptor missing");
      }
      var filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB, _runtime);
      var filterRef = _hostFilterIo.resolveFilterRef(_KDB, _runtime, { filterInstanceId: id });
      if (!filterRef || !_hostFilterIo.isWriteReady(filtersFacet)) {
        return failure(id, codes.HOST_WRITE_FAILED, "host filter API unavailable");
      }
      var previousValues = _hostFilterIo.readValues(filtersFacet, filterRef);
      var selection = payload.selection || {};
      var values = selection.displayValue === _config.ALLE
        ? [] : [{ d: selection.displayValue, u: selection.useValue }];
      var writeResult = await _hostFilterIo.writeVerified(filtersFacet, filterRef, values, {
        expected: selection,
        verifyRollback: true
      });
      if (!writeResult.ok) {
        if (writeResult.errorCode === codes.COMMIT_VERIFICATION_MISMATCH ||
          writeResult.errorCode === codes.HOST_ROLLBACK_UNVERIFIED) {
          return failure(
            id,
            writeResult.errorCode,
            "delegated host reread mismatch; rollback " +
              (writeResult.rollbackVerified === true ? "confirmed" : "verification failed"),
            writeResult.errorCode === codes.HOST_ROLLBACK_UNVERIFIED
          );
        }
        return failure(id, codes.HOST_WRITE_FAILED, "host write failed");
      }
      var observed = writeResult.observed || {};
      var ownerResult = await notifySichtOwner(_KDB, {
        filterType: "sicht",
        filterInstanceId: id,
        filterScope: record.scopeType,
        filterLabel: record.filterLabel,
        operationId: operationId,
        source: payload.source || "parameterRestore",
        skipHistory: payload.skipHistory === true
      }, {
        displayValue: observed.d,
        useValue: observed.u,
        displaySource: "cognos"
      });
      if (!ownerResult.ok) {
        var ownerRollbackOk = await _hostFilterIo.rollbackVerified(filtersFacet, filterRef, previousValues);
        return failure(
          id,
          ownerRollbackOk ? ownerResult.code : codes.HOST_ROLLBACK_UNVERIFIED,
          "owner notification failed; host rollback " +
            (ownerRollbackOk ? "confirmed" : "verification failed") + ": " + ownerResult.message,
          !ownerRollbackOk
        );
      }
      seenOps[operationId] = id;
      var operationKeys = Object.keys(seenOps);
      if (operationKeys.length > _config.DELEGATED_OPERATION_WINDOW) { delete seenOps[operationKeys[0]]; }
      return success(id);
    } catch (error) {
      console.error("[singleSelect.applyOwnerSelection] failed", { filterInstanceId: id }, error);
      return failure(id, codes.HOST_WRITE_FAILED, String(error && error.message ? error.message : error));
    }
  }

  return {
    applyOwnerSelection: applyOwnerSelection
  };
});
