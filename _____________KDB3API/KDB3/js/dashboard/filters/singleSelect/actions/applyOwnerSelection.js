define([
  "../effects/resolveFilterRef.js",
  "../effects/writeVerifiedSelection.js",
  "../effects/readFiltersFacet.js",
  "../effects/hostFilterWrite.js",
  "../config/errorCodes.js",
  "./ownerSelectionSupport.js"
], function (_resolveFilterRef, _writeVerifiedSelection, _readFiltersFacet, _hostWrite, _codes, _support) {
  "use strict";

  async function applyOwnerSelection(_KDB, _runtime, _payload) {
    var payload = _payload || {};
    var id = payload.filterInstanceId;
    try {
      var operationId = payload.operationId ? String(payload.operationId) : "";
      var seenOps = _runtime.delegatedOperationIds = _runtime.delegatedOperationIds || {};
      if (!operationId || payload.notifyOwner !== "sicht" || payload.skipHistory !== true) {
        return _support.failure(id, _codes.OWNER_SELECTION_INVALID, "operationId, notifyOwner sicht and skipHistory true are required");
      }
      if (!payload.selection || payload.selection.displayValue == null ||
        payload.selection.useValue == null) {
        return _support.failure(id, _codes.OWNER_SELECTION_INVALID, "selection requires independent display/use values");
      }
      if (seenOps[operationId] && seenOps[operationId] !== id) {
        return _support.failure(id, _codes.OWNER_SELECTION_INVALID, "operationId was reused for another filter instance");
      }
      if (seenOps[operationId] === id) {
        return _support.success(id);
      }
      var root = _KDB.state.filters.singleSelect;
      var record = root.instancesById ? root.instancesById[id] : null;
      if (!record || record.selectionOwner !== "sicht" ||
        record.status !== "active" || record.hostStatus !== "present") {
        return _support.failure(id, _codes.INSTANCE_NOT_FOUND, "writable delegated Sicht descriptor missing");
      }
      var filtersFacet = _readFiltersFacet(_KDB, _runtime);
      var filterRef = _resolveFilterRef.resolveFilterRef(_KDB, _runtime, { filterInstanceId: id });
      if (!filterRef || !_hostWrite.isWriteReady(filtersFacet)) {
        return _support.failure(id, _codes.HOST_WRITE_FAILED, "host filter API unavailable");
      }
      var previousValues = _hostWrite.readValues(filtersFacet, filterRef);
      var selection = payload.selection || {};
      var values = selection.displayValue === "Alle"
        ? [] : [{ d: selection.displayValue, u: selection.useValue }];
      var writeResult = await _writeVerifiedSelection(filtersFacet, filterRef, values, {
        expected: selection,
        verifyRollback: true
      });
      if (!writeResult.ok) {
        if (writeResult.errorCode === _codes.COMMIT_VERIFICATION_MISMATCH ||
          writeResult.errorCode === _codes.HOST_ROLLBACK_UNVERIFIED) {
          return _support.failure(
            id,
            writeResult.errorCode,
            "delegated host reread mismatch; rollback " +
              (writeResult.rollbackVerified === true ? "confirmed" : "verification failed"),
            writeResult.errorCode === _codes.HOST_ROLLBACK_UNVERIFIED
          );
        }
        return _support.failure(
          id,
          _codes.HOST_WRITE_FAILED,
          "host write failed"
        );
      }
      var observed = writeResult.observed || {};
      var ownerResult = await _support.notifySichtOwner(_KDB, {
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
        var ownerRollbackOk = await _support.rollbackToPreviousValues(filtersFacet, filterRef, previousValues);
        return _support.failure(
          id,
          ownerRollbackOk ? ownerResult.code : _codes.HOST_ROLLBACK_UNVERIFIED,
          "owner notification failed; host rollback " +
            (ownerRollbackOk ? "confirmed" : "verification failed") + ": " + ownerResult.message,
          !ownerRollbackOk
        );
      }
      seenOps[operationId] = id;
      var operationKeys = Object.keys(seenOps);
      if (operationKeys.length > 100) { delete seenOps[operationKeys[0]]; }
      return _support.success(id);
    } catch (error) {
      console.error("[singleSelect.applyOwnerSelection] failed", { filterInstanceId: id }, error);
      return _support.failure(
        id,
        _codes.HOST_WRITE_FAILED,
        String(error && error.message ? error.message : error)
      );
    }
  }

  return applyOwnerSelection;
});
