define([
  "../config/actionTypes.js",
  "./initialState.js",
  "./cloneSerializable.js"
], function (_actionTypes, _initialState, _cloneSerializable) {
  "use strict";

  function createWidgetTopNReducer() {
    return function widgetTopNReducer(_state, _action) {
      var state = _state || _initialState();
      var action = _action || {};
      var payload = action.payload || {};
      var ownerVisId = readOwnerVisId(action, payload);
      switch (action.type) {
        case _actionTypes.MOUNT_STARTED:
          return Object.assign({}, state, { lifecycle: "initializing", errorCode: null, errorMessage: null });
        case _actionTypes.MOUNT_SUCCEEDED:
          return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
        case _actionTypes.MARK_PENDING:
          return markPending(registerOwner(state, ownerVisId), ownerVisId, payload);
        case _actionTypes.HELPER_CLAIMED:
          return helperClaimed(registerOwner(state, ownerVisId), ownerVisId, payload);
        case _actionTypes.RESOLUTION_SUCCEEDED:
          return resolutionSucceeded(registerOwner(state, ownerVisId), ownerVisId, payload);
        case _actionTypes.NO_HELPER_AVAILABLE:
          return noHelperAvailable(registerOwner(state, ownerVisId), ownerVisId, payload);
        case _actionTypes.ERROR_RECORDED:
          return errorRecorded(state, ownerVisId, payload);
        case _actionTypes.CLEANUP_SUCCEEDED:
          return cleanupSucceeded(registerOwner(state, ownerVisId), ownerVisId, payload);
        case _actionTypes.DESTROY:
          return Object.assign({}, state, { lifecycle: "disposed" });
        default:
          return state;
      }
    };
  }

  function readOwnerVisId(action, payload) {
    return action.widgetId || payload.ownerVisId;
  }

  function createOwnerRecord(ownerVisId) {
    return {
      ownerVisId: ownerVisId,
      resolutionStatus: "idle",
      helperWidgetId: null,
      claimToken: null,
      resultValues: [],
      excludeItemId: null,
      errorCode: null,
      errorMessage: null,
      pending: { kind: null, opSeq: null }
    };
  }

  function registerOwner(_state, ownerVisId) {
    if (!ownerVisId || _state.byOwner[ownerVisId]) {
      return _state;
    }
    var byOwner = Object.assign({}, _state.byOwner);
    byOwner[ownerVisId] = createOwnerRecord(ownerVisId);
    return Object.assign({}, _state, { byOwner: byOwner });
  }

  function markPending(_state, ownerVisId, payload) {
    if (!ownerVisId || !_state.byOwner[ownerVisId]) {
      return _state;
    }
    return writeOwner(_state, ownerVisId, {
      resolutionStatus: "pending",
      helperWidgetId: payload.helperWidgetId || _state.byOwner[ownerVisId].helperWidgetId || null,
      pending: { kind: payload.kind || "resolveRequested", opSeq: payload.opSeq || null },
      errorCode: null,
      errorMessage: null
    });
  }

  function helperClaimed(_state, ownerVisId, payload) {
    return writeOwner(_state, ownerVisId, {
      helperWidgetId: payload.helperWidgetId || null,
      claimToken: payload.claimToken || null
    });
  }

  function resolutionSucceeded(_state, ownerVisId, payload) {
    return writeOwner(_state, ownerVisId, {
      resolutionStatus: "success",
      helperWidgetId: payload.helperWidgetId || _state.byOwner[ownerVisId].helperWidgetId || null,
      claimToken: payload.claimToken || _state.byOwner[ownerVisId].claimToken || null,
      resultValues: _cloneSerializable(payload.resultValues || []),
      excludeItemId: payload.excludeItemId || null,
      pending: { kind: null, opSeq: null },
      errorCode: null,
      errorMessage: null
    });
  }

  function noHelperAvailable(_state, ownerVisId, payload) {
    return writeOwner(_state, ownerVisId, {
      resolutionStatus: "noHelperAvailable",
      helperWidgetId: null,
      claimToken: null,
      resultValues: [],
      excludeItemId: null,
      pending: { kind: null, opSeq: null },
      errorCode: payload.errorCode || "WIDGET_TOPN_NO_HELPER_AVAILABLE",
      errorMessage: payload.errorMessage || null
    });
  }

  function errorRecorded(_state, ownerVisId, payload) {
    if (ownerVisId && _state.byOwner[ownerVisId]) {
      return writeOwner(_state, ownerVisId, {
        resolutionStatus: "error",
        pending: { kind: null, opSeq: null },
        errorCode: payload.errorCode || null,
        errorMessage: payload.errorMessage || null
      });
    }
    return Object.assign({}, _state, {
      lifecycle: payload.moduleLevel === true ? "error" : _state.lifecycle,
      errorCode: payload.errorCode || null,
      errorMessage: payload.errorMessage || null
    });
  }

  function cleanupSucceeded(_state, ownerVisId, payload) {
    var record = createOwnerRecord(ownerVisId);
    if (payload.releaseClaim !== true && _state.byOwner[ownerVisId]) {
      record.helperWidgetId = _state.byOwner[ownerVisId].helperWidgetId || null;
      record.claimToken = _state.byOwner[ownerVisId].claimToken || null;
    }
    return writeOwner(_state, ownerVisId, record);
  }

  function writeOwner(_state, ownerVisId, patch) {
    if (!ownerVisId || !_state.byOwner[ownerVisId]) {
      return _state;
    }
    var byOwner = Object.assign({}, _state.byOwner);
    byOwner[ownerVisId] = Object.assign({}, byOwner[ownerVisId], patch);
    return Object.assign({}, _state, { byOwner: byOwner });
  }

  return createWidgetTopNReducer;
});
