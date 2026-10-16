define(["../../../core/utils/kit/data.js"], function (_data) {
  "use strict";

  const ACTION_TYPES = {
    MOUNT_STARTED: "widgetBase/mountStarted",
    MOUNT_SUCCEEDED: "widgetBase/mountSucceeded",
    REGISTER_FRAME: "widgetBase/registerFrame",
    MARK_PENDING: "widgetBase/markPending",
    PLACE_ON_CANVAS_SUCCEEDED: "widgetBase/placeOnCanvasSucceeded",
    ROUTE_TO_LAUNCHPAD_SUCCEEDED: "widgetBase/routeToLaunchpadSucceeded",
    REMOVE_SUCCEEDED: "widgetBase/removeSucceeded",
    ERROR_RECORDED: "widgetBase/errorRecorded",
    DESTROY: "widgetBase/destroy",
    DROP_CREATE: "widgetBase/dropCreate",
    ROUTE_TO_LAUNCHPAD: "widgetBase/routeToLaunchpad",
    ROUTE_ALL_TO_LAUNCHPAD: "widgetBase/routeAllToLaunchpad",
    ENSURE_TAB_WIDGETS_ROUTED: "widgetBase/ensureTabWidgetsRouted",
    RENDER_TAB_WIDGETS: "widgetBase/renderTabWidgetsRequested",
    TAKE_FROM_LAUNCHPAD: "widgetBase/takeFromLaunchpad",
    ENABLE_MOVE: "widgetBase/enableMove",
    SET_MOVE_MODE: "widgetBase/setMoveMode",
    RESIZE_TOGGLE: "widgetBase/resizeToggle",
    MOVE: "widgetBase/move",
    RESIZE: "widgetBase/resize",
    SET_COLOUR: "widgetBase/setColour",
    APPLY_COLOUR: "widgetBase/applyColour",
    REMOVE: "widgetBase/remove",
    REPORT_ERROR: "widgetBase/reportError",
    PARAMETER_SET_RESET: "widgetBase/parameterSetResetRequested",
    PARAMETER_SET_RESTORE: "widgetBase/parameterSetRestoreRequested",
    PREPARE_TAB_MUTATION: "widgetBase/prepareTabMutation",
    APPLY_TAB_MUTATION: "widgetBase/applyTabMutation",
    RESTORE_TAB_MUTATION_SNAPSHOT: "widgetBase/restoreTabMutationSnapshot"
  };

  function createInitialWidgetBaseState() {
    return { lifecycle: "idle", byId: {}, errorCode: null, errorMessage: null };
  }

  function isNumericLayout(layout) {
    return (
      layout &&
      typeof layout.x === "number" &&
      typeof layout.y === "number" &&
      typeof layout.width === "number" &&
      typeof layout.height === "number"
    );
  }

  function normalizeWidgetLayout(layout) {
    const value = layout || {};
    return {
      x: Math.round(value.x || 0),
      y: Math.round(value.y || 0),
      width: Math.round(value.width || 300),
      height: Math.round(value.height || 200)
    };
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

  function patchFrame(state, widgetId, patch) {
    if (!widgetId || !state.byId[widgetId]) {
      return state;
    }
    const byId = Object.assign({}, state.byId);
    byId[widgetId] = Object.assign({}, byId[widgetId], typeof patch === "function" ? patch(byId[widgetId]) : patch);
    return Object.assign({}, state, { byId: byId });
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
    return patchFrame(state, widgetId, function (frame) {
      return {
        pending: { kind: payload.kind || null, opSeq: payload.opSeq || null },
        lifecycle: payload.lifecycle || frame.lifecycle || "loading"
      };
    });
  }

  function placeOnCanvasSucceeded(state, widgetId, payload) {
    return patchFrame(state, widgetId, function (frame) {
      const patch = {
        placement: "onCanvas",
        layout: _data.cloneJson(payload.layout),
        lastCanvasLayout: _data.cloneJson(payload.layout),
        launchpadPad: null,
        launchpadSlotKey: null,
        pending: { kind: null, opSeq: null },
        lifecycle: "ready",
        colour: payload.colour !== undefined ? payload.colour : frame.colour
      };
      if (typeof payload.tabId === "string" && payload.tabId !== "") {
        patch.tabId = payload.tabId;
      }
      return patch;
    });
  }

  function routeToLaunchpadSucceeded(state, widgetId, payload) {
    return patchFrame(state, widgetId, function (frame) {
      return {
        placement: "inLaunchpad",
        launchpadPad: payload.launchpadPad || null,
        launchpadSlotKey: payload.launchpadSlotKey || null,
        layout: null,
        lastCanvasLayout: payload.lastCanvasLayout !== undefined ? _data.cloneJson(payload.lastCanvasLayout) : frame.lastCanvasLayout,
        pending: { kind: null, opSeq: null },
        lifecycle: "ready"
      };
    });
  }

  function removeSucceeded(state, widgetId) {
    return patchFrame(state, widgetId, { placement: "removed", pending: { kind: null, opSeq: null }, lifecycle: "disposed" });
  }

  function errorRecorded(state, widgetId, payload) {
    const fields = { lifecycle: "error", errorCode: payload.errorCode || null, errorMessage: payload.errorMessage || null };
    if (widgetId && state.byId[widgetId]) {
      return patchFrame(state, widgetId, fields);
    }
    return Object.assign({}, state, fields);
  }

  function createWidgetBaseReducer() {
    return function widgetBaseReducer(_state, _action) {
      const state = _state || createInitialWidgetBaseState();
      const action = _action || {};
      const payload = action.payload || {};
      switch (action.type) {
        case ACTION_TYPES.MOUNT_STARTED:
          return Object.assign({}, state, { lifecycle: "initializing", errorCode: null, errorMessage: null });
        case ACTION_TYPES.MOUNT_SUCCEEDED:
          return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
        case ACTION_TYPES.REGISTER_FRAME:
          return registerFrame(state, payload);
        case ACTION_TYPES.MARK_PENDING:
          return markPending(state, action.widgetId, payload);
        case ACTION_TYPES.PLACE_ON_CANVAS_SUCCEEDED:
          return placeOnCanvasSucceeded(state, action.widgetId, payload);
        case ACTION_TYPES.ROUTE_TO_LAUNCHPAD_SUCCEEDED:
          return routeToLaunchpadSucceeded(state, action.widgetId, payload);
        case ACTION_TYPES.REMOVE_SUCCEEDED:
          return removeSucceeded(state, action.widgetId);
        case ACTION_TYPES.ERROR_RECORDED:
          return errorRecorded(state, action.widgetId, payload);
        case ACTION_TYPES.DESTROY:
          return Object.assign({}, state, { lifecycle: "disposed" });
        default:
          return state;
      }
    };
  }

  function readCount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function readSkipped(result) {
    if (result.skipped === true) {
      return true;
    }
    const isAggregate = Object.prototype.hasOwnProperty.call(result, "routed") || Object.prototype.hasOwnProperty.call(result, "failed");
    return isAggregate ? readCount(result.skipped) : false;
  }

  function normalizeDispatchResult(_result) {
    const result = _result || {};
    const normalized = {
      ok: result.ok === true,
      outcome: result.outcome,
      reason: result.reason,
      widgetId: result.widgetId,
      opSeq: result.opSeq,
      skipped: readSkipped(result),
      routed: readCount(result.routed),
      failed: readCount(result.failed),
      stale: result.stale === true,
      rolledBack: result.rolledBack === true,
      placement: result.placement,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      reasonCode: result.reasonCode
    };
    if (result.isEligibleListEmpty === true) {
      normalized.isEligibleListEmpty = true;
    }
    return normalized;
  }

  return {
    ACTION_TYPES: ACTION_TYPES,
    createInitialWidgetBaseState: createInitialWidgetBaseState,
    createWidgetBaseReducer: createWidgetBaseReducer,
    normalizeWidgetLayout: normalizeWidgetLayout,
    isNumericLayout: isNumericLayout,
    normalizeDispatchResult: normalizeDispatchResult
  };
});
