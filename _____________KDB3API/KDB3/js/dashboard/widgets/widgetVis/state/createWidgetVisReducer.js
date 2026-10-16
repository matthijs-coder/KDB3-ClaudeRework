define(["../config/actionTypes.js", "./initialState.js", "./cloneSerializable.js"], function (_actionTypes, _initialState, _cloneSerializable) {
  "use strict";

  function createEmptyVisRecord(_widgetId) {
    return {
      widgetId: _widgetId,
      derived: {
        titleText: "",
        code: null,
        display: null,
        metricsTable: null,
        langtext: null,
        url: null,
        topNResultValues: [],
        datasourceId: null,
        datasourceName: null,
        lastAppliedVisType: null,
        emptyStatus: null,
        emptyReason: null
      },
      maximized: false,
      pending: { kind: null, opSeq: null },
      errorCode: null,
      errorMessage: null
    };
  }

  function createWidgetVisReducer() {
    return function widgetVisReducer(_state, _action) {
      var state = _state || _initialState();
      var action = _action || {};
      var payload = action.payload || {};
      switch (action.type) {
        case _actionTypes.MOUNT_STARTED:
          return Object.assign({}, state, { lifecycle: "initializing", errorCode: null, errorMessage: null });
        case _actionTypes.MOUNT_SUCCEEDED:
          return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
        case _actionTypes.REGISTER_CONTENT:
          return registerContent(state, action.widgetId, payload);
        case _actionTypes.MARK_PENDING:
          return markPending(state, action.widgetId, payload);
        case _actionTypes.APPLY_SUCCEEDED:
          return applySucceeded(state, action.widgetId, payload);
        case _actionTypes.CLEANUP_SUCCEEDED:
          return cleanupSucceeded(state, action.widgetId, payload);
        case _actionTypes.MAXIMIZE_SUCCEEDED:
          return maximizeSucceeded(state, action.widgetId, payload);
        case _actionTypes.ERROR_RECORDED:
          return errorRecorded(state, action.widgetId, payload);
        case _actionTypes.DESTROY:
          return Object.assign({}, state, { lifecycle: "disposed" });
        default:
          return state;
      }
    };
  }

  function registerContent(_state, _widgetId, _payload) {
    if (!_widgetId) {
      return _state;
    }
    var byId = Object.assign({}, _state.byId);
    var existing = byId[_widgetId] || createEmptyVisRecord(_widgetId);
    var record = _payload.record || {};
    // Merge derived field-by-field: a wholesale replace dropped the canonical
    // derived defaults (topNResultValues, emptyStatus, ...) after contentCreate.
    var derived = Object.assign({}, existing.derived, record.derived || {});
    byId[_widgetId] = Object.assign({}, existing, record, { derived: derived, widgetId: _widgetId });
    return Object.assign({}, _state, { byId: byId });
  }

  function markPending(_state, _widgetId, _payload) {
    if (!_widgetId || !_state.byId[_widgetId]) {
      return _state;
    }
    var byId = Object.assign({}, _state.byId);
    byId[_widgetId] = Object.assign({}, byId[_widgetId], {
      pending: { kind: _payload.kind || null, opSeq: _payload.opSeq || null },
      errorCode: null,
      errorMessage: null
    });
    return Object.assign({}, _state, { byId: byId });
  }

  function mergeDerivedAndClearPending(_state, _widgetId, _payload, _extra) {
    if (!_widgetId || !_state.byId[_widgetId]) {
      return _state;
    }
    var byId = Object.assign({}, _state.byId);
    var derived = Object.assign({}, byId[_widgetId].derived, _cloneSerializable(_payload.derived || {}));
    byId[_widgetId] = Object.assign({}, byId[_widgetId], Object.assign({
      derived: derived,
      pending: { kind: null, opSeq: null },
      errorCode: null,
      errorMessage: null
    }, _extra || {}));
    return Object.assign({}, _state, { byId: byId });
  }

  function applySucceeded(_state, _widgetId, _payload) {
    return mergeDerivedAndClearPending(_state, _widgetId, _payload);
  }

  function cleanupSucceeded(_state, _widgetId, _payload) {
    return mergeDerivedAndClearPending(_state, _widgetId, _payload, { maximized: false });
  }

  function maximizeSucceeded(_state, _widgetId, _payload) {
    if (!_widgetId || !_state.byId[_widgetId]) {
      return _state;
    }
    var byId = Object.assign({}, _state.byId);
    byId[_widgetId] = Object.assign({}, byId[_widgetId], {
      maximized: _payload.nextMaximized === true,
      pending: { kind: null, opSeq: null },
      errorCode: null,
      errorMessage: null
    });
    return Object.assign({}, _state, { byId: byId });
  }

  function errorRecorded(_state, _widgetId, _payload) {
    if (_widgetId && _state.byId[_widgetId]) {
      var byId = Object.assign({}, _state.byId);
      byId[_widgetId] = Object.assign({}, byId[_widgetId], {
        errorCode: _payload.errorCode || null,
        errorMessage: _payload.errorMessage || null,
        pending: { kind: null, opSeq: null }
      });
      return Object.assign({}, _state, { byId: byId });
    }
    return Object.assign({}, _state, {
      errorCode: _payload.errorCode || null,
      errorMessage: _payload.errorMessage || null
    });
  }

  return createWidgetVisReducer;
});
