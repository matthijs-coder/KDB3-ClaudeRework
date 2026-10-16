define([
  "../effects/verifyCommitFilterValue.js",
  "../effects/hostFilterWrite.js",
  "../config/errorCodes.js"
], function (_verifyCommitFilterValue, _hostWrite, _codes) {
  "use strict";

  async function rollbackToPreviousValues(_filtersFacet, _filterRef, _previousValues) {
    try {
      if (!(await _hostWrite.writeValues(_filtersFacet, _filterRef, _previousValues))) {
        return false;
      }
      var expected = _previousValues && _previousValues[0]
        ? { displayValue: _previousValues[0].d, useValue: _previousValues[0].u }
        : { displayValue: "Alle", useValue: "" };
      return _verifyCommitFilterValue(_filtersFacet, _filterRef, expected).ok === true;
    } catch (error) {
      console.error("[singleSelect.applyOwnerSelection] rollback reread failed", error);
      return false;
    }
  }

  function isNegativeAck(_ack) {
    return _ack === false || (_ack && _ack.ok === false) ||
      (_ack && _ack.acknowledged === false);
  }

  async function notifySichtOwner(_KDB, _handoff, _selection) {
    try {
      var api = _KDB && _KDB.api && _KDB.api.sicht ? _KDB.api.sicht : null;
      if (!api || typeof api.dispatch !== "function") {
        return failureResult(
          _codes.OWNER_SELECTION_INVALID,
          "sicht owner dispatch API unavailable"
        );
      }
      var ack = await api.dispatch({
        type: "sicht/singleSelectCommitted",
        payload: {
          filterInstanceId: _handoff.filterInstanceId || null,
          filterLabel: _handoff.filterLabel || null,
          filterScope: _handoff.filterScope || null,
          selection: {
            displayValue: _selection.displayValue,
            useValue: _selection.useValue,
            displaySource: _selection.displaySource || "cognos"
          },
          operationId: _handoff.operationId || null,
          source: _handoff.source || "parameterRestore",
          skipHistory: _handoff.skipHistory === true,
          timestamp: Date.now()
        }
      });
      if (isNegativeAck(ack)) {
        return failureResult(
          _codes.OWNER_SELECTION_INVALID,
          "sicht owner rejected delegated singleSelect commit notification"
        );
      }
      return { ok: true };
    } catch (error) {
      return failureResult(
        _codes.OWNER_SELECTION_INVALID,
        "sicht owner dispatch failed: " +
          String(error && error.message ? error.message : error)
      );
    }
  }

  function success(_id) {
    return Promise.resolve({
      ok: true,
      degraded: false,
      applied: [{ filterInstanceId: _id, ok: true, degraded: false }],
      diagnostics: []
    });
  }

  function failure(_id, _code, _message, _degraded) {
    return Promise.resolve({
      ok: false,
      degraded: _degraded === true,
      applied: [{
        filterInstanceId: _id,
        ok: false,
        degraded: _degraded === true,
        errorCode: _code
      }],
      diagnostics: [{ code: _code, filterInstanceId: _id, message: _message }]
    });
  }

  function failureResult(_code, _message) {
    return { ok: false, degraded: false, code: _code, message: _message };
  }

  return {
    rollbackToPreviousValues: rollbackToPreviousValues,
    notifySichtOwner: notifySichtOwner,
    success: success,
    failure: failure
  };
});
