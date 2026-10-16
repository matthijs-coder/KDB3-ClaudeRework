define([
  "./resolveFilterRef.js",
  "./resolveFilterValueFromTable.js",
  "./verifyCommitFilterValue.js",
  "./readFiltersFacet.js",
  "./hostFilterWrite.js",
  "../config.js"
], function (
  _resolveFilterRef,
  _resolveFilterValue,
  _verifyCommit,
  _readFiltersFacet,
  _hostWrite,
  _config
) {
  "use strict";

  function codedError(_code, _message) {
    var error = new Error(_message);
    error.code = _code;
    return error;
  }

  async function __controller(_KDB, _runtime, _handoff, _displayValue) {
    var filtersFacet;
    var filterRef;
    var previousValues;
    try {
      filtersFacet = _readFiltersFacet(_KDB, _runtime);
      filterRef = _resolveFilterRef.resolveFilterRef(_KDB, _runtime, _handoff);
      if (!_hostWrite.isWriteReady(filtersFacet) || !filterRef) {
        throw codedError(_config.errorCodes.HOST_WRITE_FAILED, "filter host writer unavailable");
      }
      previousValues = _hostWrite.readValues(filtersFacet, filterRef);
      var selectedValue;
      if (_displayValue === "Alle") {
        selectedValue = { d: "Alle", u: "" };
        if (!(await _hostWrite.writeValues(filtersFacet, filterRef, []))) {
          throw codedError(_config.errorCodes.HOST_WRITE_FAILED, "filter host writer unavailable");
        }
      } else {
        var resolved = await _resolveFilterValue.resolveFilterValueFromTable(
          _KDB,
          _handoff.filterLabel,
          _displayValue,
          _handoff
        );
        if (!resolved || resolved.ok !== true) {
          throw codedError(_config.errorCodes.HOST_WRITE_FAILED, "selection pair resolution failed: " + (resolved && resolved.errorCode || "unknown"));
        }
        selectedValue = resolved.selectedValue;
        if (!(await _hostWrite.writeValues(filtersFacet, filterRef, [selectedValue]))) {
          throw codedError(_config.errorCodes.HOST_WRITE_FAILED, "filter host writer unavailable");
        }
      }
      var verified = _verifyCommit(filtersFacet, filterRef, {
        displayValue: selectedValue.d,
        useValue: selectedValue.u
      });
      if (verified.ok !== true) {
        throw codedError(_config.errorCodes.COMMIT_VERIFICATION_MISMATCH, "host reread did not confirm display/use pair");
      }
      return {
        filterRef: filterRef,
        selection: {
          displayValue: _displayValue === "Alle" ? "Alle" : verified.observed.d,
          useValue: _displayValue === "Alle" ? "" : verified.observed.u,
          displaySource: _displayValue === "Alle" ? "policy" : "cognos"
        }
      };
    } catch (error) {
      if (filterRef) {
        error.filterRef = filterRef;
      }
      if (typeof previousValues !== "undefined") {
        error.previousValues = previousValues;
      }
      console.error("[singleSelect.executeConfirmedCommit] failed", {
        filterInstanceId: _handoff && _handoff.filterInstanceId
      }, error);
      throw error;
    }
  }

  return __controller;
});
