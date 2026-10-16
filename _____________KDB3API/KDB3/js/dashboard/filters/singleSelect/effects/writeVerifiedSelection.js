define([
  "./verifyCommitFilterValue.js",
  "./hostFilterWrite.js",
  "../config.js"
], function (_verifyCommitFilterValue, _hostWrite, _config) {
  "use strict";

  function cloneValues(_values) {
    return Array.isArray(_values) ? _values.map(function (_value) {
      return { d: _value.d, u: _value.u };
    }) : [];
  }

  function fail(_errorCode, _rollbackVerified, _previous, _observed) {
    return {
      ok: false,
      errorCode: _errorCode,
      rollbackVerified: _rollbackVerified,
      previous: _previous,
      observed: _observed
    };
  }

  async function writeVerifiedSelection(_filtersFacet, _filterRef, _values, _opts) {
    var previous = [];
    try {
      var opts = _opts || {};
      if (!_hostWrite.isWriteReady(_filtersFacet) || !_filterRef) {
        return fail(_config.errorCodes.HOST_WRITE_FAILED, null, [], null);
      }
      var values = cloneValues(_values);
      previous = cloneValues(_hostWrite.readValues(_filtersFacet, _filterRef));
      var expected = opts.expected;
      if (!expected) {
        expected = values.length > 0
          ? { displayValue: values[0].d, useValue: values[0].u }
          : { displayValue: "Alle", useValue: "" };
      }
      if (!(await _hostWrite.writeValues(_filtersFacet, _filterRef, values))) {
        return fail(_config.errorCodes.HOST_WRITE_FAILED, null, previous, null);
      }
      var verified = _verifyCommitFilterValue(_filtersFacet, _filterRef, expected);
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
        if (!(await _hostWrite.writeValues(_filtersFacet, _filterRef, previous))) {
          if (opts.verifyRollback === true) {
            return fail(_config.errorCodes.HOST_ROLLBACK_UNVERIFIED, false, previous, verified.observed);
          }
          return fail(_config.errorCodes.HOST_WRITE_FAILED, null, previous, verified.observed);
        }
      } catch (rollbackError) {
        if (opts.verifyRollback === true) {
          return fail(_config.errorCodes.HOST_ROLLBACK_UNVERIFIED, false, previous, verified.observed);
        }
        throw rollbackError;
      }
      if (opts.verifyRollback !== true) {
        return fail(_config.errorCodes.COMMIT_VERIFICATION_MISMATCH, null, previous, verified.observed);
      }
      var rollbackExpected = previous[0]
        ? { displayValue: previous[0].d, useValue: previous[0].u }
        : { displayValue: "Alle", useValue: "" };
      try {
        var rollbackOk = _verifyCommitFilterValue(_filtersFacet, _filterRef, rollbackExpected).ok === true;
        if (rollbackOk) {
          return fail(_config.errorCodes.COMMIT_VERIFICATION_MISMATCH, true, previous, verified.observed);
        }
        return fail(_config.errorCodes.HOST_ROLLBACK_UNVERIFIED, false, previous, verified.observed);
      } catch (rollbackVerifyError) {
        return fail(_config.errorCodes.HOST_ROLLBACK_UNVERIFIED, false, previous, verified.observed);
      }
    } catch (error) {
      console.error("[singleSelect.writeVerifiedSelection] failed", error);
      return {
        ok: false,
        errorCode: _config.errorCodes.HOST_WRITE_FAILED,
        rollbackVerified: null,
        previous: previous || [],
        observed: null
      };
    }
  }

  return writeVerifiedSelection;
});
