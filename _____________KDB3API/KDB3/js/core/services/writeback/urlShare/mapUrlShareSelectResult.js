define([], function () {
  "use strict";

  function mapUrlShareSelectResult(_selectResult, _parameterId, _isDestroyed) {
    try {
      if (_isDestroyed || !_selectResult || _selectResult.aborted === true) {
        return {
          kind: "failed",
          parameterId: _parameterId,
          shouldRecover: false,
          restoreResult: _selectResult && _selectResult.restoreResult
        };
      }
      if (_selectResult.hostListReady === false) {
        return {
          kind: "hostListUnready",
          parameterId: _parameterId,
          shouldRecover: true,
          recoverCopy: "hostListUnready"
        };
      }
      if (_selectResult.found === false && _selectResult.hostListReady === true) {
        return {
          kind: "missingId",
          parameterId: _parameterId,
          shouldRecover: true,
          recoverCopy: "missingId",
          waitTimedOut: false
        };
      }
      if (_selectResult.found === false) {
        return {
          kind: "hostListUnready",
          parameterId: _parameterId,
          shouldRecover: true,
          recoverCopy: "hostListUnready"
        };
      }
      if (_selectResult.found === true && _selectResult.timedOut === true) {
        return {
          kind: "missingId",
          parameterId: _parameterId,
          shouldRecover: true,
          recoverCopy: "missingId",
          waitTimedOut: true
        };
      }
      if (_selectResult.found === true && _selectResult.restoreResult && _selectResult.restoreResult.ok === true) {
        return {
          kind: "applied",
          parameterId: _parameterId,
          shouldRecover: false,
          restoreResult: _selectResult.restoreResult
        };
      }
      return {
        kind: "failed",
        parameterId: _parameterId,
        shouldRecover: false,
        restoreResult: _selectResult.restoreResult
      };
    } catch (error) {
      console.error("[writebackSet.mapUrlShareSelectResult] failed", error);
      throw error;
    }
  }

  return mapUrlShareSelectResult;
});
