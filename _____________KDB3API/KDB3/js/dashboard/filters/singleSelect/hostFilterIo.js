define([
  "./config.js",
  "./runtime.js",
  "./state/selection.js"
], function (_config, _singleSelectRuntime, _selectionState) {
  "use strict";

  var codes = _config.errorCodes;

  // Returns a facet ref {itemId?, itemName?, scopeId} from the live instance
  // record. Host writes use this ref. The old live-handle cache is gone; it
  // used to be emptied before inventory and caused the M4 second race
  // (HOST_WRITE_FAILED in the reconcile gap).
  function resolveFilterRef(_KDB, _runtimeOrHandoff, _maybeHandoff) {
    var handoff = _maybeHandoff || _runtimeOrHandoff;
    var id = handoff ? handoff.filterInstanceId : null;
    var root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    var rec = root && root.instancesById && id ? root.instancesById[id] : null;
    var itemId;
    var itemName;
    var ref;
    if (!rec) {
      return null;
    }
    itemId = rec.itemId == null ? "" : String(rec.itemId).trim();
    itemName = rec.itemName == null ? "" : String(rec.itemName);
    if (!itemId && !itemName) {
      return null;
    }
    ref = { scopeId: rec.scopeId == null ? "" : String(rec.scopeId) };
    if (itemId) {
      ref.itemId = itemId;
    }
    if (itemName) {
      ref.itemName = itemName;
    }
    return ref;
  }

  function isWriteReady(_filtersFacet) {
    return !!(_filtersFacet && typeof _filtersFacet.writeFilter === "function");
  }

  function readValues(_filtersFacet, _filterRef) {
    var outcome;
    if (!_filtersFacet || !_filterRef || typeof _filtersFacet.readFilterValues !== "function") {
      return [];
    }
    outcome = _filtersFacet.readFilterValues(_filterRef);
    if (!outcome || outcome.ok !== true || !Array.isArray(outcome.data)) {
      return [];
    }
    return outcome.data;
  }

  async function writeValues(_filtersFacet, _filterRef, _values) {
    var outcome;
    if (!isWriteReady(_filtersFacet) || !_filterRef) {
      return false;
    }
    outcome = await _filtersFacet.writeFilter({
      ref: _filterRef,
      values: Array.isArray(_values) ? _values : []
    });
    return !!(outcome && outcome.ok === true);
  }

  function normalizeExpected(_expectedSelection) {
    if (_expectedSelection && typeof _expectedSelection === "object") {
      return {
        displayValue: _expectedSelection.displayValue == null ? "" : String(_expectedSelection.displayValue),
        useValue: _expectedSelection.useValue == null ? "" : String(_expectedSelection.useValue)
      };
    }
    return {
      displayValue: _expectedSelection == null ? "" : String(_expectedSelection),
      useValue: ""
    };
  }

  function readPair(_values) {
    if (!_values || !_values[0]) { return { d: "", u: "" }; }
    return {
      d: _values[0].d == null ? "" : String(_values[0].d),
      u: _values[0].u == null ? "" : String(_values[0].u)
    };
  }

  function verifySelection(_filtersFacet, _filterRef, _expectedSelection) {
    var expected = normalizeExpected(_expectedSelection);
    var values = readValues(_filtersFacet, _filterRef);
    var observed;
    if (expected.displayValue === _config.ALLE && expected.useValue === "") {
      return { ok: values.length === 0, observed: { d: "", u: "" }, values: values };
    }
    if (values.length !== 1) { return { ok: false, observed: readPair(values), values: values }; }
    observed = readPair(values);
    return {
      ok: observed.d === expected.displayValue && observed.u === expected.useValue,
      observed: observed,
      values: values
    };
  }

  function cloneValues(_values) {
    return Array.isArray(_values) ? _values.map(function (_value) {
      return { d: _value.d, u: _value.u };
    }) : [];
  }

  function failWrite(_errorCode, _rollbackVerified, _previous, _observed) {
    return {
      ok: false,
      errorCode: _errorCode,
      rollbackVerified: _rollbackVerified,
      previous: _previous,
      observed: _observed
    };
  }

  async function writeVerified(_filtersFacet, _filterRef, _values, _opts) {
    var previous = [];
    try {
      var opts = _opts || {};
      if (!isWriteReady(_filtersFacet) || !_filterRef) {
        return failWrite(codes.HOST_WRITE_FAILED, null, [], null);
      }
      var values = cloneValues(_values);
      previous = cloneValues(readValues(_filtersFacet, _filterRef));
      var expected = opts.expected;
      if (!expected) {
        expected = values.length > 0
          ? { displayValue: values[0].d, useValue: values[0].u }
          : { displayValue: _config.ALLE, useValue: "" };
      }
      if (!(await writeValues(_filtersFacet, _filterRef, values))) {
        return failWrite(codes.HOST_WRITE_FAILED, null, previous, null);
      }
      var verified = verifySelection(_filtersFacet, _filterRef, expected);
      if (verified.ok === true) {
        return {
          ok: true,
          errorCode: null,
          rollbackVerified: null,
          previous: previous,
          observed: verified.observed
        };
      }
      try {
        if (!(await writeValues(_filtersFacet, _filterRef, previous))) {
          if (opts.verifyRollback === true) {
            return failWrite(codes.HOST_ROLLBACK_UNVERIFIED, false, previous, verified.observed);
          }
          return failWrite(codes.HOST_WRITE_FAILED, null, previous, verified.observed);
        }
      } catch (rollbackError) {
        if (opts.verifyRollback === true) {
          return failWrite(codes.HOST_ROLLBACK_UNVERIFIED, false, previous, verified.observed);
        }
        throw rollbackError;
      }
      if (opts.verifyRollback !== true) {
        return failWrite(codes.COMMIT_VERIFICATION_MISMATCH, null, previous, verified.observed);
      }
      var rollbackExpected = previous[0]
        ? { displayValue: previous[0].d, useValue: previous[0].u }
        : { displayValue: _config.ALLE, useValue: "" };
      try {
        var rollbackOk = verifySelection(_filtersFacet, _filterRef, rollbackExpected).ok === true;
        if (rollbackOk) {
          return failWrite(codes.COMMIT_VERIFICATION_MISMATCH, true, previous, verified.observed);
        }
        return failWrite(codes.HOST_ROLLBACK_UNVERIFIED, false, previous, verified.observed);
      } catch (rollbackVerifyError) {
        return failWrite(codes.HOST_ROLLBACK_UNVERIFIED, false, previous, verified.observed);
      }
    } catch (error) {
      console.error("[singleSelect.writeVerified] failed", error);
      return {
        ok: false,
        errorCode: codes.HOST_WRITE_FAILED,
        rollbackVerified: null,
        previous: previous || [],
        observed: null
      };
    }
  }

  async function writeInstanceSelection(_KDB, _runtime, _filterInstanceId, _values) {
    try {
      var filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB, _runtime);
      var filterRef = resolveFilterRef(_KDB, _runtime, { filterInstanceId: _filterInstanceId });
      if (!filtersFacet || !filterRef) {
        return { ok: false, errorCode: codes.HOST_WRITE_FAILED };
      }
      var result = await writeVerified(filtersFacet, filterRef, _values, {
        verifyRollback: false
      });
      return {
        ok: result.ok === true,
        errorCode: result.ok === true ? null : (result.errorCode || codes.HOST_WRITE_FAILED)
      };
    } catch (error) {
      console.error("[singleSelect.writeInstanceSelection] failed", {
        filterInstanceId: _filterInstanceId
      }, error);
      return { ok: false, errorCode: codes.HOST_WRITE_FAILED };
    }
  }

  async function rollbackExact(_filtersFacet, _filterRef, _priorValues) {
    var observed;
    var expected;
    var actual;
    try {
      if (!(await writeValues(_filtersFacet, _filterRef, _priorValues || []))) {
        return { ok: false };
      }
      observed = readValues(_filtersFacet, _filterRef);
      expected = JSON.stringify((_priorValues || []).slice());
      actual = JSON.stringify(Array.isArray(observed) ? observed : []);
      return { ok: expected === actual };
    } catch (error) {
      return { ok: false, error: error };
    }
  }

  async function rollbackVerified(_filtersFacet, _filterRef, _previousValues) {
    try {
      if (!(await writeValues(_filtersFacet, _filterRef, _previousValues))) {
        return false;
      }
      var expected = _previousValues && _previousValues[0]
        ? { displayValue: _previousValues[0].d, useValue: _previousValues[0].u }
        : { displayValue: _config.ALLE, useValue: "" };
      return verifySelection(_filtersFacet, _filterRef, expected).ok === true;
    } catch (error) {
      console.error("[singleSelect.rollbackVerified] rollback reread failed", error);
      return false;
    }
  }

  async function restorePreviousSelection(_KDB, _filterRef, _previousConfirmedSelection, _previousHostValues) {
    var filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB);
    var selection = _selectionState.normalizeConfirmedSelection(_previousConfirmedSelection);
    var values = Array.isArray(_previousHostValues) ? _previousHostValues : [];
    if (!isWriteReady(filtersFacet) || !_filterRef) {
      return;
    }
    if (!Array.isArray(_previousHostValues) && selection.displayValue === null) {
      console.error("[singleSelect.restorePreviousSelection] display unavailable for rollback");
      return false;
    }
    if (!Array.isArray(_previousHostValues) && selection.displayValue !== _config.ALLE) {
      values = [{ u: selection.useValue, d: selection.displayValue }];
    }
    try {
      if (!(await writeValues(filtersFacet, _filterRef, values))) {
        return false;
      }
      var expected = values.length > 0
        ? { displayValue: values[0].d, useValue: values[0].u }
        : { displayValue: _config.ALLE, useValue: "" };
      if (!verifySelection(filtersFacet, _filterRef, expected).ok) {
        console.error("[singleSelect.restorePreviousSelection] rollback reread mismatch");
        return false;
      }
    } catch (error) {
      console.error("[singleSelect.restorePreviousSelection] rollback failed", {
        displayValue: selection.displayValue
      }, error);
      return false;
    }
    return true;
  }

  return {
    resolveFilterRef: resolveFilterRef,
    isWriteReady: isWriteReady,
    readValues: readValues,
    writeValues: writeValues,
    verifySelection: verifySelection,
    writeVerified: writeVerified,
    writeInstanceSelection: writeInstanceSelection,
    rollbackExact: rollbackExact,
    rollbackVerified: rollbackVerified,
    restorePreviousSelection: restorePreviousSelection
  };
});
