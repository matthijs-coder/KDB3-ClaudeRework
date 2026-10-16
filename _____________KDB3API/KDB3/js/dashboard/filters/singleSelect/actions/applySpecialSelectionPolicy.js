define([
  "../effects/resolveFilterRef.js",
  "../effects/verifyCommitFilterValue.js",
  "../effects/commitSelectionState.js",
  "../effects/readFiltersFacet.js",
  "../effects/hostFilterWrite.js",
  "../config/errorCodes.js"
], function (_resolveFilterRef, _verifyCommitFilterValue, _commitSelectionState, _readFiltersFacet, _hostWrite, _codes) {
  "use strict";

  function matchesSemanticId(_record, _semanticId) {
    return String(_record && _record.condition || "").trim().toLowerCase() ===
      String(_semanticId || "").trim().toLowerCase();
  }

  function validatePayload(_payload) {
    var operations = { applyDefault: true, clearHidden: true, restoreParked: true };
    if (!_payload.semanticSpecialFilterId || !operations[_payload.operation]) {
      return "semanticSpecialFilterId and a supported operation are required";
    }
    if (_payload.source !== "specialSingleSelect" || _payload.skipHistory !== true) {
      return "special policy actions require source specialSingleSelect and skipHistory true";
    }
    if (_payload.operation !== "clearHidden") {
      var selection = _payload.selection;
      if (!selection || selection.displayValue == null || selection.useValue == null) {
        return "applyDefault/restoreParked require a display/use selection pair";
      }
    }
    return null;
  }

  async function applyOne(_KDB, _runtime, _payload, _id) {
    try {
      var root = _KDB.state.filters.singleSelect;
      var record = root.instancesById ? root.instancesById[_id] : null;
      if (!record || record.selectionOwner !== "singleSelect" ||
        record.status !== "active" || record.hostStatus !== "present" ||
        record.filterType !== "specialSingleSelect" ||
        !matchesSemanticId(record, _payload.semanticSpecialFilterId)) {
        return failed(_id, _codes.SPECIAL_INSTANCE_MISSING);
      }
      var filtersFacet = _readFiltersFacet(_KDB, _runtime);
      var filterRef = _resolveFilterRef.resolveFilterRef(_KDB, _runtime, { filterInstanceId: _id });
      if (!filterRef || !_hostWrite.isWriteReady(filtersFacet)) {
        return failed(_id, _codes.SPECIAL_POLICY_APPLY_FAILED);
      }
      var clear = _payload.operation === "clearHidden";
      var expected = clear ? { displayValue: "Alle", useValue: "" } : _payload.selection;
      var previousValues = _hostWrite.readValues(filtersFacet, filterRef);
      if (!(await _hostWrite.writeValues(filtersFacet, filterRef, clear ? [] : [{
        d: expected.displayValue,
        u: expected.useValue
      }]))) {
        return failed(_id, _codes.SPECIAL_POLICY_APPLY_FAILED);
      }
      var verification = _verifyCommitFilterValue(filtersFacet, filterRef, expected);
      if (verification.ok !== true) {
        await _hostWrite.writeValues(filtersFacet, filterRef, previousValues);
        var rollbackExpected = previousValues && previousValues[0]
          ? { displayValue: previousValues[0].d, useValue: previousValues[0].u }
          : { displayValue: "Alle", useValue: "" };
        try {
          _verifyCommitFilterValue(filtersFacet, filterRef, rollbackExpected);
        } catch (rollbackError) {
          console.error("[singleSelect.applySpecialSelectionPolicy] rollback reread failed", rollbackError);
        }
        return failed(_id, _codes.COMMIT_VERIFICATION_MISMATCH);
      }
      _commitSelectionState.applyConfirmedState(record, root, {
        displayValue: clear ? "Alle" : verification.observed.d,
        useValue: clear ? "" : verification.observed.u,
        displaySource: clear ? "policy" : "cognos"
      });
      return { filterInstanceId: _id, ok: true, degraded: false };
    } catch (error) {
      console.error("[singleSelect.applySpecialSelectionPolicy.applyOne] failed", {
        filterInstanceId: _id,
        operation: _payload.operation
      }, error);
      return failed(_id, _codes.SPECIAL_POLICY_APPLY_FAILED);
    }
  }

  function failed(_id, _code) {
    return { filterInstanceId: _id, ok: false, degraded: false, errorCode: _code };
  }

  async function applySpecialSelectionPolicy(_KDB, _runtime, _payload) {
    var payload = _payload || {};
    try {
      var validationError = validatePayload(payload);
      if (validationError) {
        return {
          ok: false, degraded: false, applied: [],
          diagnostics: [{ code: _codes.SPECIAL_POLICY_APPLY_FAILED, message: validationError }]
        };
      }
      var ids = [];
      var seen = {};
      var applied = [];
      var diagnostics = [];
      (payload.filterInstanceIds || []).forEach(function (_id) {
        if (_id && !seen[_id]) { seen[_id] = true; ids.push(_id); }
      });
      for (var i = 0; i < ids.length; i += 1) {
        var result = await applyOne(_KDB, _runtime, payload, ids[i]);
        applied.push(result);
        if (result.ok !== true) {
          diagnostics.push({ code: result.errorCode || _codes.SPECIAL_POLICY_APPLY_FAILED, filterInstanceId: ids[i], message: "special selection policy apply failed" });
        }
      }
      return { ok: diagnostics.length === 0, degraded: diagnostics.length > 0, applied: applied, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.applySpecialSelectionPolicy] failed", error);
      return {
        ok: false, degraded: false, applied: [],
        diagnostics: [{ code: _codes.SPECIAL_POLICY_APPLY_FAILED, message: String(error && error.message ? error.message : error) }]
      };
    }
  }

  return applySpecialSelectionPolicy;
});
