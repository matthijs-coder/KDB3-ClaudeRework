define([
  "../config.js",
  "../runtime.js",
  "../hostFilterIo.js",
  "../state/selection.js",
  "../inventory/reconcile.js",
  "../view.js",
  "./runs.js",
  "./generationGuards.js",
  "../../sicht/state/selectors.js"
], function (
  _config,
  _singleSelectRuntime,
  _hostFilterIo,
  _selectionState,
  _reconcileInventory,
  _view,
  _runs,
  _guards,
  _sichtSelectors
) {
  "use strict";

  function resolveConfirmedSelection(_KDB, _record, _assignment, _diagnostics) {
    var assignmentEntry = _assignment || {};
    var record = _record || {};
    if (record.selectionOwner !== "sicht") { return record.currentSelection; }
    var confirmed = typeof _sichtSelectors.readConfirmedSichtSelection === "function"
      ? _sichtSelectors.readConfirmedSichtSelection(_KDB)
      : null;
    if (!confirmed || !confirmed.displayValue) {
      _diagnostics.push({
        code: _config.parameterSetCodes.RESYNC_FAILED,
        key: assignmentEntry.key,
        tab: assignmentEntry.tab,
        message: "sicht confirmed selection unavailable for delegated resync"
      });
      return null;
    }
    if (confirmed.filterInstanceId &&
      record.filterInstanceId &&
      String(confirmed.filterInstanceId) !== String(record.filterInstanceId)) {
      _diagnostics.push({ code: _config.parameterSetCodes.RESYNC_FAILED, key: assignmentEntry.key, tab: assignmentEntry.tab, message: "sicht confirmed selection targets another delegated instance" });
      return null;
    }
    return {
      displayValue: confirmed.displayValue,
      useValue: confirmed.useValue != null ? String(confirmed.useValue) : ""
    };
  }

  function settleResult(_diagnostics, _reconcileResult, _progress) {
    var diagnostics = (_diagnostics || []).concat(
      _reconcileResult && Array.isArray(_reconcileResult.diagnostics) ? _reconcileResult.diagnostics : []
    );
    var progress = _progress || {};
    var applied = Array.isArray(progress.applied) ? progress.applied.slice() : [];
    var skipped = Array.isArray(progress.skipped) ? progress.skipped.slice() : [];
    var hasHardFailure = diagnostics.some(function (diagnostic) {
      return diagnostic.code === _config.parameterSetCodes.RESYNC_FAILED || diagnostic.code === _config.parameterSetCodes.CANCELLED;
    });
    if (_reconcileResult && _reconcileResult.ok === false) {
      hasHardFailure = true;
    }
    return {
      ok: !hasHardFailure,
      applied: applied,
      skipped: skipped,
      degraded: !hasHardFailure && (diagnostics.length > 0 ||
        skipped.length > 0 ||
        !!(_reconcileResult && _reconcileResult.degraded === true)),
      diagnostics: diagnostics
    };
  }

  function shouldSkipDegradedResyncWrite(_selection, _useValue) {
    return !!_useValue &&
      (_selection.displaySource === "unavailable" || _selection.displayValue == null);
  }

  function keepResyncOwnerSelection(_canonicalInstance, _root, _selection) {
    var nextSelection = {
      displayValue: _selection.displayValue,
      useValue: _selection.useValue,
      displaySource: _selection.displaySource
    };
    _selectionState.applyConfirmedState(_canonicalInstance, _root, nextSelection);
    return nextSelection;
  }

  function cancelledPair(_guard, _assignment, _filterInstanceId, _reason, _rollback) {
    var guardDiagnostic = _guard.diagnostics && _guard.diagnostics[0]
      ? _guard.diagnostics[0]
      : { code: _config.parameterSetCodes.CANCELLED, message: "singleSelect resync superseded before canonical commit" };
    return {
      cancelledResult: {
        ok: false,
        degraded: !!_rollback,
        applied: [],
        skipped: [{
          filterInstanceId: _filterInstanceId || null,
          key: _assignment && _assignment.key,
          reason: _reason
        }],
        diagnostics: [{
          code: guardDiagnostic.code || _config.parameterSetCodes.CANCELLED,
          key: _assignment && _assignment.key,
          tab: _assignment && _assignment.tab,
          message: String(guardDiagnostic.message || "") +
            (_rollback ? "; rollback " + (_rollback.ok ? "succeeded" : "failed") : "")
        }]
      }
    };
  }

  function updateCanonicalInstance(_record, _selection) {
    if (!_record || _record.selectionOwner !== "singleSelect" || !_selection) {
      return;
    }
    _record.currentSelection = { displayValue: _selection.displayValue, useValue: _selection.useValue, displaySource: _selection.displaySource };
    _record.backupSelection = { displayValue: _selection.displayValue, useValue: _selection.useValue, displaySource: _selection.displaySource };
    _record.pendingSelection = { displayValue: _selection.displayValue };
  }

  async function applyConfirmedPair(_KDB, _filterRef, _selection, _payload, _assignment, _filterInstanceId) {
    try {
      var filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB);
      var useValue = _selection && _selection.useValue != null ? String(_selection.useValue) : "";
      var incomingDisplay = _selection && _selection.displayValue;
      var incomingSource = _selection && _selection.displaySource;
      var root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
      var canonicalInstance = root && root.instancesById ? root.instancesById[_filterInstanceId] : null;
      if (shouldSkipDegradedResyncWrite(_selection, useValue)) {
        return {
          displayValue: incomingDisplay == null ? null : String(incomingDisplay),
          useValue: useValue,
          displaySource: incomingSource || "unavailable"
        };
      }
      var displayValue = incomingDisplay != null ? String(incomingDisplay) : "";
      if (!_hostFilterIo.isWriteReady(filtersFacet)) {
        throw new Error("replaceFilterContext unavailable");
      }
      var priorValues = _hostFilterIo.readValues(filtersFacet, _filterRef);
      var rollbackInput = Array.isArray(priorValues)
        ? priorValues.map(function (entry) { return Object.assign({}, entry || {}); })
        : [];
      var preWriteGuard = _guards.validateMutationGuard(_KDB, _payload || {});
      if (!preWriteGuard.ok) {
        return cancelledPair(preWriteGuard, _assignment, _filterInstanceId, "supersededBeforeHostWrite", null);
      }
      if (!(await _hostFilterIo.writeValues(filtersFacet, _filterRef, useValue ? [{ d: displayValue, u: useValue }] : []))) {
        throw new Error("replaceFilterContext unavailable");
      }
      var postGuard = _guards.validateMutationGuard(_KDB, _payload || {});
      if (!postGuard.ok) {
        var rollbackPost = await _hostFilterIo.rollbackExact(filtersFacet, _filterRef, rollbackInput);
        return cancelledPair(postGuard, _assignment, _filterInstanceId, "supersededAfterHostWrite", rollbackPost);
      }
      var verifyResult = _hostFilterIo.verifySelection(filtersFacet, _filterRef, {
        displayValue: useValue ? displayValue : "Alle",
        useValue: useValue
      });
      if (useValue && incomingSource === "table" && incomingDisplay != null) {
        return keepResyncOwnerSelection(canonicalInstance, root, _selection);
      }
      if (!verifyResult.ok) {
        var rollbackVerify = await _hostFilterIo.rollbackExact(filtersFacet, _filterRef, rollbackInput);
        throw new Error("resync host reread mismatch; rollback " + (rollbackVerify.ok ? "succeeded" : "failed"));
      }
      var preCommitGuard = _guards.validateMutationGuard(_KDB, _payload || {});
      if (!preCommitGuard.ok) {
        var rollbackCommit = await _hostFilterIo.rollbackExact(filtersFacet, _filterRef, rollbackInput);
        return cancelledPair(preCommitGuard, _assignment, _filterInstanceId, "supersededBeforeCanonicalCommit", rollbackCommit);
      }
      if (!useValue) {
        updateCanonicalInstance(canonicalInstance, {
          displayValue: "Alle",
          useValue: "",
          displaySource: "policy"
        });
        return { displayValue: "Alle", useValue: "", displaySource: "policy" };
      }
      var committedSelection = {
        displayValue: verifyResult.observed.d,
        useValue: verifyResult.observed.u,
        displaySource: "cognos"
      };
      updateCanonicalInstance(canonicalInstance, committedSelection);
      return committedSelection;
    } catch (error) {
      console.error("[singleSelect.parameterSetResyncApplyPair.applyConfirmedPair] failed", error);
      throw error;
    }
  }

  async function resyncApplied(_KDB, _runtime, _payload, _diagnostics, _progress) {
    try {
      var payload = _payload || {};
      var runId = payload.runId;
      var registered = _runs.readAppliedPageContext(_KDB, runId) || {};
      var ids = Object.keys(registered);
      var root = _KDB.state.filters.singleSelect;
      for (var idx = 0; idx < ids.length; idx += 1) {
        var assignment = registered[ids[idx]];
        var rec = root.instancesById ? root.instancesById[ids[idx]] : null;
        var filterRef = _hostFilterIo.resolveFilterRef(_KDB, _runtime, { filterInstanceId: ids[idx] });
        if (!rec || !filterRef) {
          _diagnostics.push({ code: _config.parameterSetCodes.RESYNC_FAILED, key: assignment.key, tab: assignment.tab, message: "resync instance missing after restore" });
          _progress.skipped.push({ filterInstanceId: ids[idx], key: assignment.key, reason: "instanceMissing" });
          continue;
        }
        var confirmedSelection = resolveConfirmedSelection(_KDB, rec, assignment, _diagnostics);
        if (!confirmedSelection) {
          _progress.skipped.push({ filterInstanceId: ids[idx], key: assignment.key, reason: "confirmedSelectionUnavailable" });
          continue;
        }
        var preGuard = _guards.validateMutationGuard(_KDB, payload);
        if (!preGuard.ok) {
          return { ok: false, cancelledResult: preGuard };
        }
        var observedSelection = await applyConfirmedPair(_KDB, filterRef, confirmedSelection, payload, assignment, ids[idx]);
        if (observedSelection.cancelledResult) {
          return { ok: false, cancelledResult: observedSelection.cancelledResult };
        }
        _progress.applied.push({ filterInstanceId: ids[idx], key: assignment.key, ok: true });
      }
      if (ids.length === 0) {
        _diagnostics.push({ code: _config.parameterSetCodes.RESYNC_UNREGISTERED, message: "no restore assignments were registered for this run" });
        _progress.skipped.push({ filterInstanceId: null, reason: "noRegisteredAssignments" });
      }
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error
      };
    }
  }

  async function handleParameterSetResync(_KDB, _runtime, _payload) {
    try {
      var payload = _payload || {};
      var diagnostics = [];
      var progress = { applied: [], skipped: [] };
      var result;
      var guardResult = _runs.guardRun(_KDB, payload);
      if (guardResult) {
        result = _runs.normalizeResult(guardResult);
      } else {
        var writebackGate = _guards.ensureWritebackPinnedGeneration(_KDB, payload);
        if (!writebackGate.ok) {
          result = _runs.normalizeResult({
            ok: false,
            degraded: false,
            applied: [],
            skipped: [],
            diagnostics: [{ code: writebackGate.code || _config.parameterSetCodes.INVENTORY_STALE, message: writebackGate.message }]
          });
        } else {
          var applyOutcome = await resyncApplied(_KDB, _runtime, payload, diagnostics, progress);
          if (applyOutcome && applyOutcome.cancelledResult) {
            result = _runs.normalizeResult(applyOutcome.cancelledResult);
          } else if (applyOutcome && applyOutcome.ok === false) {
            diagnostics.push({
              code: _config.parameterSetCodes.RESYNC_FAILED,
              message: "singleSelect resync apply failed: " + String(
                applyOutcome.error && applyOutcome.error.message ? applyOutcome.error.message : applyOutcome.error
              )
            });
            result = settleResult(diagnostics, null, progress);
          } else {
            var reconcileResult = await _reconcileInventory.reconcileFilterInstances(
              _KDB,
              _runtime,
              { reason: "parameterRestore", runId: payload.runId }
            );
            result = settleResult(diagnostics, reconcileResult, progress);
            if (reconcileResult && isFinite(Number(reconcileResult.generation))) {
              result.inventoryGeneration = Number(reconcileResult.generation);
            }
          }
        }
      }
      if (result && result.ok === false) {
        return _runs.mergeTerminalCleanup(_KDB, payload, result, { reportAlreadyReleased: false });
      }
      if (result && result.ok !== false) {
        _view.handleCommittedDisplay(_KDB);
      }
      return result || settleResult(diagnostics, null, progress);
    } catch (error) {
      if (error && error.cancelledResult) {
        return _runs.mergeTerminalCleanup(
          _KDB,
          _payload || {},
          _runs.normalizeResult(error.cancelledResult),
          { reportAlreadyReleased: false }
        );
      }
      return _runs.mergeTerminalCleanup(_KDB, _payload || {}, {
          ok: false,
          degraded: false,
          applied: [],
          skipped: [],
          diagnostics: [{
            code: _config.parameterSetCodes.RESYNC_FAILED,
            message: "singleSelect resync failed: " + String(error && error.message ? error.message : error)
          }]
        }, { reportAlreadyReleased: false }
      );
    }
  }

  return { handleParameterSetResync: handleParameterSetResync };
});
