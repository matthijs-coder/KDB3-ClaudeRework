define(["./results.js", "../../../core/utils/kit/data.js"], function (_results, _data) {
  "use strict";

  var ACTION_TYPES = {
    RESOLVE_REQUESTED: "widgetTopN/resolveRequested",
    CLEANUP: "widgetTopN/cleanup",
    ERROR: "widgetTopN/error",
    MOUNT_STARTED: "widgetTopN/mountStarted",
    MOUNT_SUCCEEDED: "widgetTopN/mountSucceeded",
    MARK_PENDING: "widgetTopN/markPending",
    HELPER_CLAIMED: "widgetTopN/helperClaimed",
    RESOLUTION_SUCCEEDED: "widgetTopN/resolutionSucceeded",
    NO_HELPER_AVAILABLE: "widgetTopN/noHelperAvailable",
    ERROR_RECORDED: "widgetTopN/errorRecorded",
    CLEANUP_SUCCEEDED: "widgetTopN/cleanupSucceeded",
    OWNER_REMOVED: "widgetTopN/ownerRemoved",
    DESTROY: "widgetTopN/destroy"
  };

  // Lifecycle terms for widgetTopN: idle, initializing, ready, error, disposed.
  function createInitialState() {
    return { lifecycle: "idle", byOwner: {}, errorCode: null, errorMessage: null };
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

  function reduceWidgetTopN(_state, _action) {
    var state = _state || createInitialState();
    var action = _action || {};
    var payload = action.payload || {};
    var ownerVisId = action.widgetId || payload.ownerVisId;
    switch (action.type) {
      case ACTION_TYPES.MOUNT_STARTED:
        return Object.assign({}, state, { lifecycle: "initializing", errorCode: null, errorMessage: null });
      case ACTION_TYPES.MOUNT_SUCCEEDED:
        return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
      case ACTION_TYPES.MARK_PENDING:
        return markPending(registerOwner(state, ownerVisId), ownerVisId, payload);
      case ACTION_TYPES.HELPER_CLAIMED:
        return writeOwner(registerOwner(state, ownerVisId), ownerVisId, {
          helperWidgetId: payload.helperWidgetId || null,
          claimToken: payload.claimToken || null
        });
      case ACTION_TYPES.RESOLUTION_SUCCEEDED:
        return resolutionSucceeded(registerOwner(state, ownerVisId), ownerVisId, payload);
      case ACTION_TYPES.NO_HELPER_AVAILABLE:
        return noHelperAvailable(registerOwner(state, ownerVisId), ownerVisId, payload);
      case ACTION_TYPES.ERROR_RECORDED:
        return errorRecorded(state, ownerVisId, payload);
      case ACTION_TYPES.CLEANUP_SUCCEEDED:
        return cleanupSucceeded(registerOwner(state, ownerVisId), ownerVisId, payload);
      case ACTION_TYPES.OWNER_REMOVED:
        return removeOwner(state, ownerVisId);
      case ACTION_TYPES.DESTROY:
        return Object.assign({}, state, { lifecycle: "disposed" });
      default:
        return state;
    }
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

  function resolutionSucceeded(_state, ownerVisId, payload) {
    return writeOwner(_state, ownerVisId, {
      resolutionStatus: "success",
      helperWidgetId: payload.helperWidgetId || _state.byOwner[ownerVisId].helperWidgetId || null,
      claimToken: payload.claimToken || _state.byOwner[ownerVisId].claimToken || null,
      resultValues: _data.cloneJson(payload.resultValues || []),
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

  function removeOwner(_state, ownerVisId) {
    if (!ownerVisId || !_state.byOwner[ownerVisId]) {
      return _state;
    }
    var byOwner = Object.assign({}, _state.byOwner);
    delete byOwner[ownerVisId];
    return Object.assign({}, _state, { byOwner: byOwner });
  }

  function writeOwner(_state, ownerVisId, patch) {
    if (!ownerVisId || !_state.byOwner[ownerVisId]) {
      return _state;
    }
    var byOwner = Object.assign({}, _state.byOwner);
    byOwner[ownerVisId] = Object.assign({}, byOwner[ownerVisId], patch);
    return Object.assign({}, _state, { byOwner: byOwner });
  }

  function readOwnerVisId(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    return _action && _action.widgetId || payload.ownerVisId || null;
  }

  function hasOwnerIdConflict(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var envelopeId = _action && _action.widgetId;
    return !!(envelopeId && payload.ownerVisId && payload.ownerVisId !== envelopeId);
  }

  function validateAction(_action) {
    var action = _action || {};
    if (!action.type) {
      return { errorCode: "WIDGET_TOPN_INVALID_REQUEST", errorMessage: "Missing widgetTopN action type." };
    }
    if (hasOwnerIdConflict(action)) {
      return { errorCode: "WIDGET_TOPN_OWNER_ID_CONFLICT" };
    }
    return action;
  }

  function validateResolveRequest(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var ownerVisId = readOwnerVisId(_action);
    if (!ownerVisId || hasOwnerIdConflict(_action)) {
      return _results.ownerIdConflict();
    }
    if (payload.topNChoice === undefined || (!isDefaultTopN(payload.topNChoice) && (!payload.dataConfig || !payload.config))) {
      return { ok: false, ownerVisId: ownerVisId, status: "error", errorCode: "WIDGET_TOPN_INVALID_REQUEST" };
    }
    return {
      ok: true,
      ownerVisId: ownerVisId,
      topNChoice: payload.topNChoice,
      jahrFilterValue: payload.jahrFilterValue || payload.yearFilterValue || null,
      monatFilterValue: payload.monatFilterValue || null,
      dataConfig: payload.dataConfig || {},
      hierarchySnapshot: payload.hierarchySnapshot || null,
      config: payload.config || {},
      source: payload.source || null,
      tabId: payload.tabId || null
    };
  }

  function validateCleanupRequest(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var ownerVisId = readOwnerVisId(_action);
    if (!ownerVisId || hasOwnerIdConflict(_action)) {
      return _results.ownerIdConflict();
    }
    return {
      ok: true,
      ownerVisId: ownerVisId,
      reason: payload.reason || "cleanup",
      clearHelperBinding: payload.clearHelperBinding === true,
      releaseClaim: payload.releaseClaim === true,
      dataConfig: payload.dataConfig || null,
      config: payload.config || {}
    };
  }

  function isDefaultTopN(value) {
    var text = value === null || value === undefined ? "" : String(value).trim().toLowerCase();
    return text === "" || text === "default" || text === "none" || text === "0";
  }

  function readTopNOptions(config) {
    return config && config.topNOptions ? config.topNOptions : {};
  }

  function shouldSkipPostResolutionCleanup(config) {
    var options = readTopNOptions(config);
    return !!(
      config && config.preserveHelperBindingForInspection === true ||
      options.skipPostResolutionHelperCleanup === true ||
      options.preserveHelperBindingForInspection === true
    );
  }

  return {
    ACTION_TYPES: ACTION_TYPES,
    createInitialState: createInitialState,
    reduceWidgetTopN: reduceWidgetTopN,
    validateAction: validateAction,
    validateResolveRequest: validateResolveRequest,
    validateCleanupRequest: validateCleanupRequest,
    isDefaultTopN: isDefaultTopN,
    readTopNOptions: readTopNOptions,
    shouldSkipPostResolutionCleanup: shouldSkipPostResolutionCleanup
  };
});
