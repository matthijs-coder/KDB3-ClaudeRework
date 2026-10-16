define([], function () {
  "use strict";
  // `status` (`idle`|`active`|`removed`) is domain chrome presence, not module `lifecycle`.
  // The German keys aktualisierungsDatumRaw / aktualisierungsDatumFormatted are kept (PO lock); createdUserName is English.

  function createInitialFooterState() {
    return {
      status: "idle",
      aktualisierungsDatumRaw: null,
      aktualisierungsDatumFormatted: null,
      createdUserName: null
    };
  }

  function copyState(_state) {
    return {
      status: _state.status,
      aktualisierungsDatumRaw: _state.aktualisierungsDatumRaw == null ? null : _state.aktualisierungsDatumRaw,
      aktualisierungsDatumFormatted: _state.aktualisierungsDatumFormatted == null ? null : _state.aktualisierungsDatumFormatted,
      createdUserName: _state.createdUserName == null ? null : _state.createdUserName
    };
  }

  function reduceApplyUpdateDate(_state, _payload) {
    var raw = _payload.raw == null || _payload.raw === "" ? null : String(_payload.raw);
    var formatted = _payload.formatted == null || _payload.formatted === "" ? "n.v." : String(_payload.formatted);
    if (raw === _state.aktualisierungsDatumRaw && formatted === _state.aktualisierungsDatumFormatted) return _state;
    var next = copyState(_state);
    next.aktualisierungsDatumRaw = raw;
    next.aktualisierungsDatumFormatted = formatted;
    return next;
  }

  function reduceApplyCreatedUser(_state, _payload) {
    var userName = _payload.userName == null || _payload.userName === "" ? null : String(_payload.userName);
    if (userName === _state.createdUserName) return _state;
    var next = copyState(_state);
    next.createdUserName = userName;
    return next;
  }

  function reduceStatus(_state, _status) {
    if (_state.status === _status) return _state;
    var next = copyState(_state);
    next.status = _status;
    return next;
  }

  function reduceFooter(_state, _action) {
    if (!_state || !_action || typeof _action.type !== "string") return _state;
    var payload = _action.payload || {};
    switch (_action.type) {
      case "footer/toggle": return reduceStatus(_state, _state.status === "active" ? "removed" : "active");
      case "footer/show": return reduceStatus(_state, "active");
      case "footer/hide": return _state.status === "active" ? reduceStatus(_state, "removed") : _state;
      case "footer/applyUpdateDate": return reduceApplyUpdateDate(_state, payload);
      case "footer/applyCreatedUser": return reduceApplyCreatedUser(_state, payload);
      default: return _state;
    }
  }

  return {
    createInitialFooterState: createInitialFooterState,
    reduceFooter: reduceFooter
  };
});
