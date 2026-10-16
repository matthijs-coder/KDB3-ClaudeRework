define([
  "../config.js",
  "../hostFilterIo.js",
  "../runtime.js",
  "../state/selection.js"
], function (_config, _hostFilterIo, _singleSelectRuntime, _selectionState) {
  "use strict";

  var codes = _config.errorCodes;
  var ALLE = _config.ALLE;

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

  function failed(_id, _code) {
    return { filterInstanceId: _id, ok: false, degraded: false, errorCode: _code };
  }

  async function applyOne(_KDB, _runtime, _payload, _id) {
    try {
      var root = _KDB.state.filters.singleSelect;
      var record = root.instancesById ? root.instancesById[_id] : null;
      if (!record || record.selectionOwner !== "singleSelect" ||
        record.status !== "active" || record.hostStatus !== "present" ||
        record.filterType !== "specialSingleSelect" ||
        !matchesSemanticId(record, _payload.semanticSpecialFilterId)) {
        return failed(_id, codes.SPECIAL_INSTANCE_MISSING);
      }
      var filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB, _runtime);
      var filterRef = _hostFilterIo.resolveFilterRef(_KDB, _runtime, { filterInstanceId: _id });
      if (!filterRef || !_hostFilterIo.isWriteReady(filtersFacet)) {
        return failed(_id, codes.SPECIAL_POLICY_APPLY_FAILED);
      }
      var clear = _payload.operation === "clearHidden";
      var expected = clear ? { displayValue: ALLE, useValue: "" } : _payload.selection;
      var written = await _hostFilterIo.writeVerified(
        filtersFacet,
        filterRef,
        clear ? [] : [{ d: expected.displayValue, u: expected.useValue }],
        { expected: expected, verifyRollback: true }
      );
      if (!written.ok) {
        if (written.rollbackVerified === false) {
          console.error("[singleSelect.applySpecialSelectionPolicy] rollback could not be verified", {
            filterInstanceId: _id
          });
        }
        return failed(
          _id,
          written.errorCode === codes.HOST_WRITE_FAILED
            ? codes.SPECIAL_POLICY_APPLY_FAILED
            : codes.COMMIT_VERIFICATION_MISMATCH
        );
      }
      _selectionState.applyConfirmedState(record, root, {
        displayValue: clear ? ALLE : written.observed.d,
        useValue: clear ? "" : written.observed.u,
        displaySource: clear ? "policy" : "cognos"
      });
      return { filterInstanceId: _id, ok: true, degraded: false };
    } catch (error) {
      console.error("[singleSelect.applySpecialSelectionPolicy.applyOne] failed", {
        filterInstanceId: _id,
        operation: _payload.operation
      }, error);
      return failed(_id, codes.SPECIAL_POLICY_APPLY_FAILED);
    }
  }

  async function applySpecialSelectionPolicy(_KDB, _runtime, _payload) {
    var payload = _payload || {};
    try {
      var validationError = validatePayload(payload);
      if (validationError) {
        return {
          ok: false, degraded: false, applied: [],
          diagnostics: [{ code: codes.SPECIAL_POLICY_APPLY_FAILED, message: validationError }]
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
          diagnostics.push({
            code: result.errorCode || codes.SPECIAL_POLICY_APPLY_FAILED,
            filterInstanceId: ids[i],
            message: "special selection policy apply failed"
          });
        }
      }
      return { ok: diagnostics.length === 0, degraded: diagnostics.length > 0, applied: applied, diagnostics: diagnostics };
    } catch (error) {
      console.error("[singleSelect.applySpecialSelectionPolicy] failed", error);
      return {
        ok: false, degraded: false, applied: [],
        diagnostics: [{ code: codes.SPECIAL_POLICY_APPLY_FAILED, message: String(error && error.message ? error.message : error) }]
      };
    }
  }

  return {
    applySpecialSelectionPolicy: applySpecialSelectionPolicy
  };
});
