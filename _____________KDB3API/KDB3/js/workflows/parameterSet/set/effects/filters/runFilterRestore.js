define([
  "../../config/restoreConstants.js",
  "../../../../../core/config/writebackErrorCodes.js",
  "./filterRestoreTargets.js",
  "./filterRestoreGeneration.js",
  "./dispatchFilterClearPhases.js",
  "./buildAllowedClearTabIdxs.js",
  "../waitForPageContextHost.js",
  "./dispatchDienststelleRestore.js",
  "./dispatchSpecialSingleSelectRestore.js"
], function (
  _constants,
  _errorCodes,
  _filterTargets,
  _filterGeneration,
  _dispatchFilterClearPhases,
  _buildAllowedClearTabIdxs,
  _waitForPageContextHost,
  _dispatchDienststelleRestore,
  _dispatchSpecialSingleSelectRestore
) {
  "use strict";

  // §6 steps 15-22 / §6.3 filter dispatch table. Runs only when filt is present.
  async function runFilterRestore(_KDB, run, normalized) {
    const filt = normalized.filt;
    const selsEntries = Array.isArray(filt.sels) ? filt.sels : [];
    const pcfsEntries = Array.isArray(filt.pcfs) ? filt.pcfs : [];
    const globalEntries = selsEntries.filter(function (entry) { return entry.tab === undefined; });
    const pageEntries = selsEntries.filter(function (entry) { return entry.tab !== undefined; });
    const requiredPageTabIdx = _filterTargets.collectPageContextTabIdx(pageEntries, filt.dstl, pcfsEntries);
    const needsPageTargets = pageEntries.length > 0
      || _filterTargets.hasTabScopedDienststelle(filt.dstl)
      || pcfsEntries.some(function (e) { return e && e.tab !== undefined; });
    const resolvedTargets = await _filterTargets.resolveLiveFilterTargets(_KDB, run, needsPageTargets);
    _filterTargets.assertRequiredLiveScopes(run, resolvedTargets, requiredPageTabIdx);
    const inventoryGeneration = await _filterGeneration.reconcileSingleSelectInventory(_KDB, run);

    const allowedClearTabIdxs = _buildAllowedClearTabIdxs(filt, resolvedTargets);
    await _dispatchFilterClearPhases(
      run, inventoryGeneration, resolvedTargets, filt.dstl !== undefined, filt.pcfs !== undefined, allowedClearTabIdxs
    );
    _filterGeneration.assertStableGeneration(_KDB, run, inventoryGeneration, "singleSelect clear");

    if (filt.sicht !== undefined) {
      await run.dispatchOwnerPhase({
        phaseName: "sichtRestore", owner: "sicht",
        type: "sicht/parameterSetRestoreRequested",
        payload: { sicht: filt.sicht, status: run.status, tabIdxToScopeId: resolvedTargets, inventoryGeneration: inventoryGeneration },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_SICHT_RESTORE_FAILED,
      });
    }

    if (globalEntries.length > 0) {
      await run.dispatchOwnerPhase({
        phaseName: "singleSelectGlobalRestore", owner: "singleSelect",
        type: "singleSelect/parameterSetRestoreRequested",
        payload: { filters: globalEntries, phase: "global", tabIdxToScopeId: resolvedTargets, inventoryGeneration: inventoryGeneration },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
      });
      _filterGeneration.assertStableGeneration(_KDB, run, inventoryGeneration, "singleSelect global restore");
    }

    for (const tabIdx of requiredPageTabIdx) {
      await run.dispatchOwnerPhase({
        phaseName: "tabActivateForPageContext", owner: "tabs",
        type: "tabs/parameterSetActivateTabRequested",
        payload: { tabIdx: tabIdx, includeHiddenDashboardTabs: true, restoreActiveTab: false },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
      });
    }

    if (requiredPageTabIdx.length > 0) {
      const hostPoll = await _waitForPageContextHost(_KDB, requiredPageTabIdx, resolvedTargets, run);
      run.assertStillCurrent();
      if (!hostPoll || hostPoll.ready !== true) {
        run.addDiagnostic(_errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING, "restore",
          "page-context host registration did not become ready before restore",
          { attempts: hostPoll && hostPoll.attempts });
        throw _constants.ABORT;
      }
    }

    // Step 19: page-context single-select filters.
    if (pageEntries.length > 0) {
      await run.dispatchOwnerPhase({
        phaseName: "singleSelectPageContextRestore", owner: "singleSelect",
        type: "singleSelect/parameterSetRestoreRequested",
        payload: { filters: pageEntries, phase: "pageContext", tabIdxToScopeId: resolvedTargets, inventoryGeneration: inventoryGeneration },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
      });
      _filterGeneration.assertStableGeneration(_KDB, run, inventoryGeneration, "singleSelect page-context restore");
    }

    if (pcfsEntries.length > 0) {
      await run.dispatchOwnerPhase({
        phaseName: "nativeMultiSelectRestore", owner: "nativeMultiSelect",
        type: "nativeMultiSelect/parameterSetRestoreRequested",
        payload: { filters: pcfsEntries, tabIdxToScopeId: resolvedTargets },
        required: true,
        failureCode: _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
      });
    }

    if (filt.sicht !== undefined) {
      await run.dispatchOwnerPhase({
        phaseName: "sichtDownstreamVisibility", owner: "sicht",
        type: "sicht/parameterSetDownstreamVisibilityRequested",
        payload: { sicht: filt.sicht, dstlWillFollow: filt.dstl !== undefined, inventoryGeneration: inventoryGeneration, tabIdxToScopeId: resolvedTargets },
        required: true, failureCode: _errorCodes.codes.WRITEBACK_SICHT_RESTORE_FAILED,
      });
    }

    await _dispatchDienststelleRestore(run, filt, resolvedTargets);

    _filterGeneration.assertStableGeneration(_KDB, run, inventoryGeneration, "pre-singleSelect resync");

    // Step 22: single-select resync after Dienststelle, before widgets.
    const resyncPhase = await run.dispatchOwnerPhase({
      phaseName: "singleSelectResync", owner: "singleSelect",
      type: "singleSelect/parameterSetResyncRequested",
      payload: { tabIdxToScopeId: resolvedTargets, inventoryGeneration: inventoryGeneration },
      required: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
    });
    const terminalInventoryGeneration = _filterGeneration.readTerminalResyncGeneration(
      run,
      resyncPhase,
      inventoryGeneration
    );
    _filterGeneration.assertStableGeneration(_KDB, run, terminalInventoryGeneration, "singleSelect resync");

    await _dispatchSpecialSingleSelectRestore(run, resolvedTargets, terminalInventoryGeneration);
    _filterGeneration.assertStableGeneration(_KDB, run, terminalInventoryGeneration, "specialSingleSelect sync");
  }

  return runFilterRestore;
});
