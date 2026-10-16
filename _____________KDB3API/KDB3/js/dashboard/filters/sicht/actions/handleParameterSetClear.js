define([
  "../effects/resolveDelegatedSichtInstanceId.js",
  "../effects/dispatchSingleSelectOwnerSelection.js",
  "../effects/buildSichtOperationId.js",
  "./parameterSetShared.js",
  "../effects/readSingleSelectInventoryGeneration.js",
  "../../singleSelect/state/selectors.js"
], function (
  _resolveDelegatedSichtInstanceId,
  _dispatchSingleSelectOwnerSelection,
  _buildSichtOperationId,
  _shared,
  _readInventoryGeneration,
  _singleSelectSelectors
) {
  "use strict";

  var RESTORE_FAILED = "WRITEBACK_SICHT_RESTORE_FAILED";

  function countLiveSichtInstances(_KDB) {
    try {
      return _singleSelectSelectors.readFilterInstances(_KDB, {
        scopeType: "global",
        status: "active",
        hostStatus: "present"
      }).filter(function (_instance) {
        return _instance.filterType === "sicht" &&
          _instance.selectionOwner === "sicht";
      }).length;
    } catch (error) {
      console.error("[sicht.handleParameterSetClear] inventory read failed", error);
      throw error;
    }
  }

  async function handleParameterSetClear(_KDB, _deps, _action) {
    var payload = (_action && _action.payload) || {};
    var runtime = _deps.runtime;
    var runClaim = _shared.claimRunId(runtime, payload.runId);
    var diagnostics = [];
    var filterInstanceId;
    var result;
    var runStatus;
    var currentGeneration;
    var hasGeneration = payload.inventoryGeneration != null;
    var failed = false;
    try {
      if (runClaim) {
        return runClaim;
      }
      if (hasGeneration && (typeof payload.inventoryGeneration !== "number" ||
        !isFinite(payload.inventoryGeneration))) {
        return _shared.failResult(
          "WRITEBACK_INVALID_V3_PAYLOAD",
          "payload.inventoryGeneration must be numeric when provided"
        );
      }
      filterInstanceId = _resolveDelegatedSichtInstanceId(_KDB);
      if (!filterInstanceId) {
        var liveInstanceCount = countLiveSichtInstances(_KDB);
        if (liveInstanceCount === 0) {
          diagnostics.push(_shared.diagnostic(
            "WRITEBACK_SICHT_CLEAR_NO_LIVE_INSTANCE",
            "no live Sicht instance exists; clear is already satisfied"
          ));
          runStatus = _shared.ensureCurrentRun(runtime, payload.runId);
          return runStatus || _shared.ack(true, diagnostics, true);
        }
        return _shared.failResult(
          RESTORE_FAILED,
          liveInstanceCount > 1
            ? "multiple live global Sicht instances make clear ambiguous"
            : "live global Sicht instance could not be resolved"
        );
      }
      currentGeneration = _readInventoryGeneration(_KDB);
      if (hasGeneration && (currentGeneration == null ||
        Number(payload.inventoryGeneration) !== Number(currentGeneration))) {
        return _shared.failResult(
          "WRITEBACK_RESTORE_CANCELLED",
          "stale inventoryGeneration for sicht clear"
        );
      }
      if (!hasGeneration) {
        diagnostics.push(_shared.diagnostic(
          "WRITEBACK_SICHT_INVENTORY_GENERATION_COMPATIBILITY",
          "inventoryGeneration missing; current singleSelect inventory was resolved safely",
          { currentGeneration: currentGeneration }
        ));
      }
      var delegatedPayload = {
        filterInstanceId: filterInstanceId,
        operationId: _buildSichtOperationId("clear"),
        operationKind: "clear",
        selection: { displayValue: "Alle", useValue: "" },
        source: "parameterRestore"
      };
      if (currentGeneration != null) {
        delegatedPayload.inventoryGeneration = hasGeneration
          ? payload.inventoryGeneration : currentGeneration;
      }
      result = await _dispatchSingleSelectOwnerSelection(_KDB, delegatedPayload);
      if (!result || result.ok !== true) {
        failed = true;
        diagnostics.push(_shared.diagnostic(
          RESTORE_FAILED,
          "sicht clear failed while delegating to singleSelect",
          { diagnostics: result && result.diagnostics }
        ));
      }
      runStatus = _shared.ensureCurrentRun(runtime, payload.runId);
      if (runStatus) {
        return runStatus;
      }
      if (failed && payload.status !== "newDashboard") {
        return _shared.ack(false, diagnostics);
      }
      return _shared.ack(true, diagnostics, !hasGeneration || failed);
    } catch (error) {
      console.error("[sicht.handleParameterSetClear] failed", error);
      return _shared.failResult(
        RESTORE_FAILED,
        String(error && error.message ? error.message : error)
      );
    }
  }

  return handleParameterSetClear;
});
