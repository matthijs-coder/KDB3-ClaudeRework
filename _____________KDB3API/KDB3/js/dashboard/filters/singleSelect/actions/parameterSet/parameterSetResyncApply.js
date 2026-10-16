define([
  "../../config/parameterSetCodes.js",
  "./parameterSetRuntime.js",
  "../../effects/resolveFilterRef.js",
  "./parameterSetResyncApplyPair.js",
  "../../../sicht/state/selectors.js"
], function (_codes, _runtime, _resolveFilterRef, _applyPair, _sichtSelectors) {
  "use strict";

  function resolveConfirmedSelection(_KDB, _record, _assignment, _diagnostics) {
    var assignmentEntry = _assignment || {};
    var record = _record || {};
    if (record.selectionOwner !== "sicht") { return record.currentSelection; }
    var confirmed = typeof _sichtSelectors.readConfirmedSichtSelection === "function"
      ? _sichtSelectors.readConfirmedSichtSelection(_KDB)
      : null;
    if (!confirmed || !confirmed.displayValue) {
      _diagnostics.push({ code: _codes.RESYNC_FAILED, key: assignmentEntry.key, tab: assignmentEntry.tab, message: "sicht confirmed selection unavailable for delegated resync" });
      return null;
    }
    if (confirmed.filterInstanceId &&
      record.filterInstanceId &&
      String(confirmed.filterInstanceId) !== String(record.filterInstanceId)) {
      _diagnostics.push({ code: _codes.RESYNC_FAILED, key: assignmentEntry.key, tab: assignmentEntry.tab, message: "sicht confirmed selection targets another delegated instance" });
      return null;
    }
    return {
      displayValue: confirmed.displayValue,
      useValue: confirmed.useValue != null ? String(confirmed.useValue) : ""
    };
  }

  function normalizeResult(_result) {
    var result = _result || {};
    return {
      ok: result.ok === true,
      applied: Array.isArray(result.applied) ? result.applied.slice() : [],
      skipped: Array.isArray(result.skipped) ? result.skipped.slice() : [],
      degraded: result.degraded === true,
      diagnostics: Array.isArray(result.diagnostics) ? result.diagnostics.slice() : []
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
      return diagnostic.code === _codes.RESYNC_FAILED || diagnostic.code === _codes.CANCELLED;
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

  async function resyncApplied(_KDB, _runtimeState, _payload, _diagnostics, _progress) {
    try {
      var payload = _payload || {};
      var runId = payload.runId;
      var registered = _runtime.readAppliedPageContext(_KDB, runId) || {};
      var ids = Object.keys(registered);
      var root = _KDB.state.filters.singleSelect;
      for (var idx = 0; idx < ids.length; idx += 1) {
        var assignment = registered[ids[idx]];
        var rec = root.instancesById ? root.instancesById[ids[idx]] : null;
        var filterRef = _resolveFilterRef.resolveFilterRef(_KDB, _runtimeState, { filterInstanceId: ids[idx] });
        if (!rec || !filterRef) {
          _diagnostics.push({ code: _codes.RESYNC_FAILED, key: assignment.key, tab: assignment.tab, message: "resync instance missing after restore" });
          _progress.skipped.push({ filterInstanceId: ids[idx], key: assignment.key, reason: "instanceMissing" });
          continue;
        }
        var confirmedSelection = resolveConfirmedSelection(_KDB, rec, assignment, _diagnostics);
        if (!confirmedSelection) {
          _progress.skipped.push({ filterInstanceId: ids[idx], key: assignment.key, reason: "confirmedSelectionUnavailable" });
          continue;
        }
        var preGuard = _runtime.validateMutationGuard(_KDB, payload);
        if (!preGuard.ok) {
          return { ok: false, cancelledResult: preGuard };
        }
        var observedSelection = await _applyPair.applyConfirmedPair(_KDB, filterRef, confirmedSelection, payload, assignment, ids[idx]);
        if (observedSelection.cancelledResult) {
          return { ok: false, cancelledResult: observedSelection.cancelledResult };
        }
        _progress.applied.push({ filterInstanceId: ids[idx], key: assignment.key, ok: true });
      }
      if (ids.length === 0) {
        _diagnostics.push({ code: _codes.RESYNC_UNREGISTERED, message: "no restore assignments were registered for this run" });
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

  return {
    resyncApplied: resyncApplied,
    resolveConfirmedSelection: resolveConfirmedSelection,
    normalizeResult: normalizeResult,
    settleResult: settleResult
  };
});
