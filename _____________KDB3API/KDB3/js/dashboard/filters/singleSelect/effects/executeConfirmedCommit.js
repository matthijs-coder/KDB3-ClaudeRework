define([
  "../hostFilterIo.js",
  "../commit/tableValues.js",
  "../runtime.js",
  "../config.js"
], function (
  _hostFilterIo,
  _tableValues,
  _singleSelectRuntime,
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
      filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB, _runtime);
      filterRef = _hostFilterIo.resolveFilterRef(_KDB, _runtime, _handoff);
      if (!_hostFilterIo.isWriteReady(filtersFacet) || !filterRef) {
        throw codedError(_config.errorCodes.HOST_WRITE_FAILED, "filter host writer unavailable");
      }
      previousValues = _hostFilterIo.readValues(filtersFacet, filterRef);
      var selectedValue;
      if (_displayValue === "Alle") {
        selectedValue = { d: "Alle", u: "" };
        if (!(await _hostFilterIo.writeValues(filtersFacet, filterRef, []))) {
          throw codedError(_config.errorCodes.HOST_WRITE_FAILED, "filter host writer unavailable");
        }
      } else {
        var resolved = await _tableValues.resolveFilterValueFromTable(
          _KDB,
          _handoff.filterLabel,
          _displayValue,
          _handoff
        );
        if (!resolved || resolved.ok !== true) {
          throw codedError(_config.errorCodes.HOST_WRITE_FAILED, "selection pair resolution failed: " + (resolved && resolved.errorCode || "unknown"));
        }
        selectedValue = resolved.selectedValue;
        if (!(await _hostFilterIo.writeValues(filtersFacet, filterRef, [selectedValue]))) {
          throw codedError(_config.errorCodes.HOST_WRITE_FAILED, "filter host writer unavailable");
        }
      }
      var verified = _hostFilterIo.verifySelection(filtersFacet, filterRef, {
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
