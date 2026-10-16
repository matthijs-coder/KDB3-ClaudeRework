define(["../config.js"], function (_config) {
  "use strict";

  function isNegativeAck(_ack) {
    return _ack === false || (_ack && _ack.ok === false) ||
      (_ack && _ack.acknowledged === false);
  }

  async function notifySichtOwner(_KDB, _handoff, _selection) {
    try {
      var api = _KDB && _KDB.api && _KDB.api.sicht ? _KDB.api.sicht : null;
      if (!api || typeof api.dispatch !== "function") {
        return failureResult(
          _config.errorCodes.OWNER_SELECTION_INVALID,
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
          _config.errorCodes.OWNER_SELECTION_INVALID,
          "sicht owner rejected delegated singleSelect commit notification"
        );
      }
      return { ok: true };
    } catch (error) {
      return failureResult(
        _config.errorCodes.OWNER_SELECTION_INVALID,
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
    notifySichtOwner: notifySichtOwner,
    success: success,
    failure: failure
  };
});
