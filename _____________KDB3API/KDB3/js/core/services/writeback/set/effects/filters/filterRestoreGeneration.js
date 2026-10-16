define([
  "../../config/restoreConstants.js",
  "../../../schema/errorCodes.js",
  "../../../../../../dashboard/filters/singleSelect/state/selectors.js",
], function (_constants, _errorCodes, _singleSelectSelectors) {
  "use strict";

  async function reconcileSingleSelectInventory(_KDB, run) {
    const phase = await run.dispatchOwnerPhase({
      phaseName: "singleSelectPreRestoreReconcile",
      owner: "singleSelect",
      type: "singleSelect/reconcileFilterInstances",
      payload: { reason: "parameterRestore", runId: run.runId },
      required: true,
      skipHistoryFlag: false,
      failureCode: _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
    });
    const resultGeneration = phase && phase.result && typeof phase.result.generation === "number"
      ? Number(phase.result.generation)
      : readInventoryGeneration(_KDB);
    if (resultGeneration == null) {
      run.addDiagnostic(
        _errorCodes.codes.WRITEBACK_SINGLESELECT_INVENTORY_STALE,
        "restore",
        "singleSelect pre-restore reconcile did not expose a numeric inventory generation"
      );
      throw _constants.ABORT;
    }
    return resultGeneration;
  }

  function readInventorySnapshot(_KDB) {
    const state = _singleSelectSelectors.readSingleSelectState(_KDB) || {};
    const inventory = state.inventory || {};
    const generation = typeof inventory.generation === "number" && isFinite(inventory.generation)
      ? Number(inventory.generation)
      : null;
    const freshness = typeof inventory.freshness === "string" ? inventory.freshness : "stale";
    return { generation: generation, freshness: freshness };
  }

  function assertStableGeneration(_KDB, run, expectedGeneration, phaseName) {
    const snapshot = readInventorySnapshot(_KDB);
    if (snapshot.generation == null || Number(snapshot.generation) !== Number(expectedGeneration)) {
      run.addDiagnostic(
        _errorCodes.codes.WRITEBACK_SINGLESELECT_INVENTORY_STALE,
        "restore",
        "singleSelect inventory generation changed during writeback restore run",
        {
          phase: phaseName,
          expectedGeneration: expectedGeneration,
          observedGeneration: snapshot.generation,
          freshness: snapshot.freshness,
        }
      );
      throw _constants.ABORT;
    }
    if (snapshot.freshness !== "fresh") {
      run.addDiagnostic(
        _errorCodes.codes.WRITEBACK_SINGLESELECT_INVENTORY_STALE,
        "restore",
        "singleSelect inventory freshness is not fresh during writeback restore run",
        { phase: phaseName, expectedGeneration: expectedGeneration, freshness: snapshot.freshness }
      );
      throw _constants.ABORT;
    }
  }

  function readTerminalResyncGeneration(run, resyncPhase, pinnedGeneration) {
    const terminalGeneration = resyncPhase &&
      resyncPhase.result &&
      typeof resyncPhase.result.inventoryGeneration === "number" &&
      isFinite(resyncPhase.result.inventoryGeneration)
      ? Number(resyncPhase.result.inventoryGeneration)
      : null;
    if (terminalGeneration == null) {
      run.addDiagnostic(
        _errorCodes.codes.WRITEBACK_SINGLESELECT_INVENTORY_STALE,
        "restore",
        "singleSelect terminal resync did not return a numeric inventory generation",
        { pinnedGeneration: pinnedGeneration }
      );
      throw _constants.ABORT;
    }
    if (Number(terminalGeneration) === Number(pinnedGeneration)) {
      run.addDiagnostic(
        _errorCodes.codes.WRITEBACK_SINGLESELECT_INVENTORY_STALE,
        "restore",
        "singleSelect terminal resync returned stale pinned inventory generation",
        { pinnedGeneration: pinnedGeneration, terminalGeneration: terminalGeneration }
      );
      throw _constants.ABORT;
    }
    return terminalGeneration;
  }

  function readInventoryGeneration(_KDB) {
    const generation = _singleSelectSelectors.readInventoryGeneration(_KDB);
    return typeof generation === "number" && isFinite(generation) ? Number(generation) : null;
  }

  return Object.freeze({
    reconcileSingleSelectInventory: reconcileSingleSelectInventory,
    assertStableGeneration: assertStableGeneration,
    readTerminalResyncGeneration: readTerminalResyncGeneration,
  });
});
