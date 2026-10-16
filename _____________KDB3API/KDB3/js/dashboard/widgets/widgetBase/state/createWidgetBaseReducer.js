define(["../config/actionTypes.js", "./initialState.js", "./cloneSerializable.js"], function (_actionTypes, _initialState, _cloneSerializable) {
  function createWidgetBaseReducer() {
    return function widgetBaseReducer(_state, _action) {
      const state = _state || _initialState();
      const action = _action || {};
      const payload = action.payload || {};
      switch (action.type) {
        case _actionTypes.MOUNT_STARTED:
          return Object.assign({}, state, { lifecycle: "initializing", errorCode: null, errorMessage: null });
        case _actionTypes.MOUNT_SUCCEEDED:
          return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
        case _actionTypes.REGISTER_FRAME:
          return registerFrame(state, payload);
        case _actionTypes.MARK_PENDING:
          return markPending(state, action.widgetId, payload);
        case _actionTypes.PLACE_ON_CANVAS_SUCCEEDED:
          return placeOnCanvasSucceeded(state, action.widgetId, payload);
        case _actionTypes.ROUTE_TO_LAUNCHPAD_SUCCEEDED:
          return routeToLaunchpadSucceeded(state, action.widgetId, payload);
        case _actionTypes.REMOVE_SUCCEEDED:
          return removeSucceeded(state, action.widgetId);
        case _actionTypes.ERROR_RECORDED:
          return errorRecorded(state, action.widgetId, payload);
        case _actionTypes.DESTROY:
          return Object.assign({}, state, { lifecycle: "disposed" });
        default:
          return state;
      }
    };
  }
  function registerFrame(state, payload) {
    const widgetId = payload.widgetId;
    if (!widgetId) {
      return state;
    }
    const byId = Object.assign({}, state.byId);
    const existing = byId[widgetId] || createEmptyFrame(widgetId);
    byId[widgetId] = Object.assign({}, existing, payload.frame || {}, { widgetId: widgetId });
    return Object.assign({}, state, { byId: byId });
  }
  function markPending(state, widgetId, payload) {
    if (!widgetId || !state.byId[widgetId]) {
      return state;
    }
    const byId = Object.assign({}, state.byId);
    const frame = Object.assign({}, byId[widgetId], {
      pending: { kind: payload.kind || null, opSeq: payload.opSeq || null },
      lifecycle: payload.lifecycle || byId[widgetId].lifecycle || "loading"
    });
    byId[widgetId] = frame;
    return Object.assign({}, state, { byId: byId });
  }
  function placeOnCanvasSucceeded(state, widgetId, payload) {
    if (!widgetId || !state.byId[widgetId]) {
      return state;
    }
    const byId = Object.assign({}, state.byId);
    const framePatch = {
      placement: "onCanvas",
      layout: _cloneSerializable(payload.layout),
      lastCanvasLayout: _cloneSerializable(payload.layout),
      launchpadPad: null,
      launchpadSlotKey: null,
      pending: { kind: null, opSeq: null },
      lifecycle: "ready",
      colour: payload.colour !== undefined ? payload.colour : byId[widgetId].colour
    };
    if (typeof payload.tabId === "string" && payload.tabId !== "") {
      framePatch.tabId = payload.tabId;
    }
    byId[widgetId] = Object.assign({}, byId[widgetId], framePatch);
    return Object.assign({}, state, { byId: byId });
  }
  function routeToLaunchpadSucceeded(state, widgetId, payload) {
    if (!widgetId || !state.byId[widgetId]) {
      return state;
    }
    const byId = Object.assign({}, state.byId);
    byId[widgetId] = Object.assign({}, byId[widgetId], {
      placement: "inLaunchpad",
      launchpadPad: payload.launchpadPad || null,
      launchpadSlotKey: payload.launchpadSlotKey || null,
      layout: null,
      lastCanvasLayout: payload.lastCanvasLayout !== undefined ? _cloneSerializable(payload.lastCanvasLayout) : byId[widgetId].lastCanvasLayout,
      pending: { kind: null, opSeq: null },
      lifecycle: "ready"
    });
    return Object.assign({}, state, { byId: byId });
  }
  function removeSucceeded(state, widgetId) {
    if (!widgetId || !state.byId[widgetId]) {
      return state;
    }
    const byId = Object.assign({}, state.byId);
    byId[widgetId] = Object.assign({}, byId[widgetId], {
      placement: "removed",
      pending: { kind: null, opSeq: null },
      lifecycle: "disposed"
    });
    return Object.assign({}, state, { byId: byId });
  }
  function errorRecorded(state, widgetId, payload) {
    if (widgetId && state.byId[widgetId]) {
      const byId = Object.assign({}, state.byId);
      byId[widgetId] = Object.assign({}, byId[widgetId], {
        lifecycle: "error",
        errorCode: payload.errorCode || null,
        errorMessage: payload.errorMessage || null
      });
      return Object.assign({}, state, { byId: byId });
    }
    return Object.assign({}, state, {
      lifecycle: "error",
      errorCode: payload.errorCode || null,
      errorMessage: payload.errorMessage || null
    });
  }
  function createEmptyFrame(widgetId) {
    return {
      widgetId: widgetId,
      kind: null,
      role: null,
      ownerWidgetId: null,
      tabId: null,
      tabHandle: 0,
      placement: "inLaunchpad",
      launchpadPad: null,
      launchpadSlotKey: null,
      layout: null,
      lastCanvasLayout: null,
      colour: null,
      lifecycle: "idle",
      pending: { kind: null, opSeq: null },
      errorCode: null,
      errorMessage: null
    };
  }
  return createWidgetBaseReducer;
});
