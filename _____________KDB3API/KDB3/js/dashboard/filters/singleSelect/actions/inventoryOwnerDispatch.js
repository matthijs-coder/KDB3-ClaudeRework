define([], function () {
  "use strict";

  function readOwnerApi(_KDB, _ownerName) {
    return _KDB && _KDB.api ? _KDB.api[_ownerName] : null;
  }

  function readOwnerActionType(_ownerName) {
    return _ownerName === "sicht"
      ? "sicht/singleSelectInventoryReconciled"
      : "specialSingleSelect/singleSelectInventoryReconciled";
  }

  function buildOwnerAckError(_codes, _support, _ownerName, _payload, _kind, _details) {
    var code = _kind === "apiMissing"
      ? _codes.INVENTORY_OWNER_API_MISSING
      : (_kind === "disposed"
        ? _codes.INVENTORY_OWNER_DISPOSED
        : (_kind === "dispatchFailed"
          ? _codes.INVENTORY_OWNER_DISPATCH_FAILED
          : _codes.INVENTORY_OWNER_REJECTED));
    var message = _kind === "apiMissing"
      ? _ownerName + " inventory reconcile API unavailable"
      : (_kind === "dispatchFailed"
        ? _ownerName + " inventory reconcile dispatch " + _details.reason + ": " + _details.message
        : _ownerName + " returned " + _details.reason + " ack for inventory generation " +
          _payload.inventoryGeneration);
    return {
      ok: false,
      acknowledged: false,
      diagnostic: _support.buildOwnerDiagnostic(
        code,
        _ownerName,
        _payload.inventoryGeneration,
        message,
        _details || null
      )
    };
  }

  async function dispatchOwner(_KDB, _codes, _support, _ownerName, _payload, _signal) {
    var api = readOwnerApi(_KDB, _ownerName);
    if (!api || typeof api.dispatch !== "function") {
      return buildOwnerAckError(_codes, _support, _ownerName, _payload, "apiMissing", null);
    }
    try {
      var ack = await _support.awaitOwnerAck(api.dispatch({
        type: readOwnerActionType(_ownerName),
        payload: Object.assign({}, _payload)
      }), _ownerName, _signal);
      if (_support.isSuccessfulAck(ack)) {
        return { ok: true, acknowledged: true, ack: ack };
      }
      var rejected = _support.describeAckFailure(ack);
      return buildOwnerAckError(
        _codes,
        _support,
        _ownerName,
        _payload,
        rejected.kind === "disposed" ? "disposed" : "rejected",
        { ack: ack, reason: rejected.kind, detail: rejected.message }
      );
    } catch (error) {
      var reason = error && error.code === "TIMEOUT"
        ? "timeout"
        : (error && error.code === "ABORTED" ? "aborted" : "failed");
      return buildOwnerAckError(
        _codes,
        _support,
        _ownerName,
        _payload,
        "dispatchFailed",
        {
          reason: reason,
          timeout: reason === "timeout",
          aborted: reason === "aborted",
          message: String(error && error.message ? error.message : error)
        }
      );
    }
  }

  return {
    dispatchOwner: dispatchOwner
  };
});
