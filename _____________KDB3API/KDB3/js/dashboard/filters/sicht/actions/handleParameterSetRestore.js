define([
  "../effects/evaluateAndStoreSichtOptions.js",
  "../effects/resolveDelegatedSichtInstanceId.js",
  "../effects/dispatchSingleSelectOwnerSelection.js",
  "../effects/buildSichtOperationId.js",
  "./parameterSetShared.js",
  "../effects/readSingleSelectInventoryGeneration.js"
], function (
  _evaluateAndStoreSichtOptions,
  _resolveDelegatedSichtInstanceId,
  _dispatchSingleSelectOwnerSelection,
  _buildSichtOperationId,
  _shared,
  _readInventoryGeneration
) {
  "use strict";

  var INVALID_PAYLOAD = "WRITEBACK_INVALID_V3_PAYLOAD";
  var RESTORE_FAILED = "WRITEBACK_SICHT_RESTORE_FAILED";

  // Amended by sicht-filterInstanceIdentity-contractdelta.md §7: the actual
  // filter write is delegated to the canonical singleSelect instance instead
  // of a direct Cognos write, gated by the writeback-owned inventoryGeneration.
  async function runParameterSetRestore(_KDB, _deps, _action) {
    var payload = (_action && _action.payload) || {};
    var runtime = _deps.runtime;
    var runClaim = _shared.claimRunId(runtime, payload.runId);
    var normalizedUse = payload.sicht != null ? String(payload.sicht).trim() : "";
    var currentGeneration;
    var byOption;
    var selection;
    var filterInstanceId;
    var result;
    var runStatus;
    var diagnostics = [];
    var hasGeneration = payload.inventoryGeneration != null;
    if (runClaim) {
      return runClaim;
    }
    if (!normalizedUse) {
      return _shared.failResult(INVALID_PAYLOAD, "sicht/parameterSetRestoreRequested requires payload.sicht (use value)");
    }
    if (hasGeneration && (typeof payload.inventoryGeneration !== "number" ||
      !isFinite(payload.inventoryGeneration))) {
      return _shared.failResult(
        INVALID_PAYLOAD,
        "payload.inventoryGeneration must be numeric when provided"
      );
    }
    currentGeneration = _readInventoryGeneration(_KDB);
    if (hasGeneration && (currentGeneration == null ||
      Number(payload.inventoryGeneration) !== Number(currentGeneration))) {
      return _shared.failResult("WRITEBACK_RESTORE_CANCELLED", "stale inventoryGeneration for sicht restore", {
        inventoryGeneration: payload.inventoryGeneration,
        currentGeneration: currentGeneration
      });
    }
    if (!hasGeneration) {
      diagnostics.push(_shared.diagnostic(
        "WRITEBACK_SICHT_INVENTORY_GENERATION_COMPATIBILITY",
        "inventoryGeneration missing; current singleSelect inventory was resolved safely",
        { currentGeneration: currentGeneration }
      ));
    }
    byOption = _evaluateAndStoreSichtOptions(_KDB, _deps.dispatchInternal);
    selection = _shared.resolveSelectionByUse(byOption, normalizedUse);
    if (!selection || !selection.displayValue || !selection.useValue) {
      return _shared.failResult(
        INVALID_PAYLOAD,
        "unsupported Sicht use value \"" + normalizedUse + "\"",
        { sicht: normalizedUse }
      );
    }
    filterInstanceId = _resolveDelegatedSichtInstanceId(_KDB);
    if (!filterInstanceId) {
      return _shared.failResult(RESTORE_FAILED, "no unique live global Sicht instance available for restore");
    }
    var delegatedPayload = {
      filterInstanceId: filterInstanceId,
      operationId: _buildSichtOperationId("restore"),
      selection: selection,
      source: "parameterRestore"
    };
    if (currentGeneration != null) {
      delegatedPayload.inventoryGeneration = hasGeneration
        ? payload.inventoryGeneration : currentGeneration;
    }
    result = await _dispatchSingleSelectOwnerSelection(_KDB, delegatedPayload);
    runStatus = _shared.ensureCurrentRun(runtime, payload.runId);
    if (runStatus) {
      return runStatus;
    }
    if (!result || result.ok !== true) {
      return _shared.failResult(
        RESTORE_FAILED,
        "sicht restore failed while delegating to singleSelect",
        { diagnostics: result && result.diagnostics }
      );
    }
    diagnostics = diagnostics.concat(result.diagnostics || []);
    return _shared.ack(
      true,
      diagnostics,
      !hasGeneration || result.degraded === true
    );
  }

  async function handleParameterSetRestore(_KDB, _deps, _action) {
    try {
      return await runParameterSetRestore(_KDB, _deps, _action);
    } catch (error) {
      console.error("[sicht.handleParameterSetRestore] failed", error);
      return _shared.failResult(
        RESTORE_FAILED,
        String(error && error.message ? error.message : error)
      );
    }
  }

  return handleParameterSetRestore;
});
