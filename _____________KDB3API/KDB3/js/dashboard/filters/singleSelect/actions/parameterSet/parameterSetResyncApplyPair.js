define([
  "../../config.js",
  "./parameterSetRuntime.js",
  "../../hostFilterIo.js",
  "../../runtime.js",
  "../../state/selection.js"
], function (_config, _runtime, _hostFilterIo, _singleSelectRuntime, _selectionState) {
  "use strict";

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
      var preWriteGuard = _runtime.validateMutationGuard(_KDB, _payload || {});
      if (!preWriteGuard.ok) {
        return cancelledResult(preWriteGuard, _assignment, _filterInstanceId, "supersededBeforeHostWrite", null);
      }
      if (!(await _hostFilterIo.writeValues(filtersFacet, _filterRef, useValue ? [{ d: displayValue, u: useValue }] : []))) {
        throw new Error("replaceFilterContext unavailable");
      }
      var postGuard = _runtime.validateMutationGuard(_KDB, _payload || {});
      if (!postGuard.ok) {
        var rollbackPost = await _hostFilterIo.rollbackExact(filtersFacet, _filterRef, rollbackInput);
        return cancelledResult(postGuard, _assignment, _filterInstanceId, "supersededAfterHostWrite", rollbackPost);
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
      var preCommitGuard = _runtime.validateMutationGuard(_KDB, _payload || {});
      if (!preCommitGuard.ok) {
        var rollbackCommit = await _hostFilterIo.rollbackExact(filtersFacet, _filterRef, rollbackInput);
        return cancelledResult(preCommitGuard, _assignment, _filterInstanceId, "supersededBeforeCanonicalCommit", rollbackCommit);
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

  function cancelledResult(_guard, _assignment, _filterInstanceId, _reason, _rollback) {
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

  return {
    applyConfirmedPair: applyConfirmedPair
  };
});
