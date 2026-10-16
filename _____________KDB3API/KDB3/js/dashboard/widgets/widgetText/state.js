define(["./config/actionTypes.js"], function (_actionTypes) {
  "use strict";

  function createInitialWidgetTextState() {
    return {
      lifecycle: "idle",
      byId: {},
      errorCode: null,
      errorMessage: null
    };
  }

  function createIdlePending() {
    return { kind: null, opSeq: null };
  }

  function createEmptyTextRecord(_widgetId) {
    return {
      widgetId: _widgetId,
      content: { text: "" },
      pending: createIdlePending(),
      errorCode: null,
      errorMessage: null
    };
  }

  function patchByIdRecord(_state, _widgetId, _patch, _baseRecord) {
    var byId = Object.assign({}, _state.byId);
    var base = _baseRecord !== undefined ? _baseRecord : byId[_widgetId];
    byId[_widgetId] = Object.assign({}, base, _patch);
    return Object.assign({}, _state, { byId: byId });
  }

  function hasRecord(_state, _widgetId) {
    return !!_widgetId && !!_state.byId[_widgetId];
  }

  function registerContent(_state, _widgetId, _payload) {
    if (!_widgetId) {
      return _state;
    }
    var existing = _state.byId[_widgetId] || createEmptyTextRecord(_widgetId);
    return patchByIdRecord(_state, _widgetId, {
      widgetId: _widgetId,
      content: { text: _payload.text != null ? String(_payload.text) : existing.content.text },
      pending: createIdlePending(),
      errorCode: null,
      errorMessage: null
    }, existing);
  }

  function commitTextContent(_state, _widgetId, _payload) {
    if (!hasRecord(_state, _widgetId)) {
      return _state;
    }
    return patchByIdRecord(_state, _widgetId, {
      content: { text: String(_payload.text != null ? _payload.text : "") },
      pending: createIdlePending(),
      errorCode: null,
      errorMessage: null
    });
  }

  function markPending(_state, _widgetId, _payload) {
    if (!hasRecord(_state, _widgetId)) {
      return _state;
    }
    return patchByIdRecord(_state, _widgetId, {
      pending: { kind: _payload.kind || null, opSeq: _payload.opSeq != null ? _payload.opSeq : null },
      errorCode: null,
      errorMessage: null
    });
  }

  function clearPending(_state, _widgetId, _payload) {
    if (!hasRecord(_state, _widgetId)) {
      return _state;
    }
    var record = _state.byId[_widgetId];
    var pendingOpSeq = record.pending ? record.pending.opSeq : null;
    if (_payload.opSeq != null && pendingOpSeq != null && pendingOpSeq !== _payload.opSeq) {
      return _state;
    }
    return patchByIdRecord(_state, _widgetId, { pending: createIdlePending() }, record);
  }

  function recordError(_state, _widgetId, _payload) {
    if (_payload.moduleLevel) {
      return Object.assign({}, _state, {
        lifecycle: "error",
        errorCode: _payload.errorCode || null,
        errorMessage: _payload.errorMessage || null
      });
    }
    if (!hasRecord(_state, _widgetId)) {
      return _state;
    }
    return patchByIdRecord(_state, _widgetId, {
      errorCode: _payload.errorCode || null,
      errorMessage: _payload.errorMessage || null
    });
  }

  function cleanupContentSucceeded(_state, _widgetId, _payload) {
    if (!_widgetId) {
      return _state;
    }
    var reason = _payload.reason || "";
    if (reason === "remove" || reason === "destroy" || reason === "parameterSetReset") {
      var byId = Object.assign({}, _state.byId);
      delete byId[_widgetId];
      return Object.assign({}, _state, { byId: byId });
    }
    if (!_state.byId[_widgetId]) {
      return _state;
    }
    return patchByIdRecord(_state, _widgetId, { pending: createIdlePending() });
  }

  function reduceWidgetText(_state, _action) {
    var state = _state || createInitialWidgetTextState();
    var action = _action || {};
    var payload = action.payload || {};
    switch (action.type) {
      case _actionTypes.MOUNT_STARTED:
        return Object.assign({}, state, { lifecycle: "initializing", errorCode: null, errorMessage: null });
      case _actionTypes.MOUNT_SUCCEEDED:
        return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
      case _actionTypes.REGISTER_CONTENT:
        return registerContent(state, action.widgetId, payload);
      case _actionTypes.COMMIT_TEXT_CONTENT:
        return commitTextContent(state, action.widgetId, payload);
      case _actionTypes.MARK_PENDING:
        return markPending(state, action.widgetId, payload);
      case _actionTypes.CLEAR_PENDING:
        return clearPending(state, action.widgetId, payload);
      case _actionTypes.ERROR_RECORDED:
        return recordError(state, action.widgetId, payload);
      case _actionTypes.CLEANUP_CONTENT_SUCCEEDED:
        return cleanupContentSucceeded(state, action.widgetId, payload);
      case _actionTypes.DESTROY:
        return Object.assign({}, state, { lifecycle: "disposed", byId: {} });
      default:
        return state;
    }
  }

  return {
    createInitialWidgetTextState: createInitialWidgetTextState,
    reduceWidgetText: reduceWidgetText
  };
});
