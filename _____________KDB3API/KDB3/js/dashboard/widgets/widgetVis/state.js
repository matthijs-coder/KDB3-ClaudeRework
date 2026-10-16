define(["../../../core/utils/kit/data.js"], function (_data) {
  "use strict";

  var ACTION_TYPES = {
    MOUNT_STARTED: "widgetVis/mountStarted",
    MOUNT_SUCCEEDED: "widgetVis/mountSucceeded",
    REGISTER_CONTENT: "widgetVis/registerContent",
    MARK_PENDING: "widgetVis/markPending",
    APPLY_SUCCEEDED: "widgetVis/applySucceeded",
    CLEANUP_SUCCEEDED: "widgetVis/cleanupSucceeded",
    MAXIMIZE_SUCCEEDED: "widgetVis/maximizeSucceeded",
    ERROR_RECORDED: "widgetVis/errorRecorded",
    RECORD_REMOVED: "widgetVis/recordRemoved",
    DESTROY: "widgetVis/destroy",
    CONTENT_CREATE: "widgetVis/contentCreate",
    WAIT_UNTIL_CONTENT_READY: "widgetVis/waitUntilContentReady",
    APPLY_STARTUP_SETTINGS: "widgetVis/applyStartupSettings",
    APPLY_DIMENSION: "widgetVis/applyDimension",
    APPLY_VIS_TYPE: "widgetVis/applyVisType",
    APPLY_TOPN_CHOICE: "widgetVis/applyTopNChoice",
    APPLY_SHOW_VALUES: "widgetVis/applyShowValues",
    APPLY_GROUPING: "widgetVis/applyGrouping",
    APPLY_ITERATOR_ZOOM: "widgetVis/applyIteratorZoom",
    TOPN_RESOLVED: "widgetVis/topNResolved",
    DIENSTSTELLE_CHANGED: "widgetVis/dienststelleChanged",
    CLEANUP_CONTENT: "widgetVis/cleanupContent",
    DISPOSE_WIDGET_RUNTIME: "widgetVis/disposeWidgetRuntime",
    ENSURE_OBSERVERS: "widgetVis/ensureObservers",
    PARAMETER_SET_CANCEL_BINDINGS: "widgetVis/parameterSetCancelBindingsRequested",
    PARAMETER_SET_BINDING: "widgetVis/parameterSetBindingRequested",
    MAXIMIZE_TOGGLE: "widgetVis/maximizeToggle",
    ERROR: "widgetVis/error"
  };

  function createInitialWidgetVisState() {
    return {
      lifecycle: "idle",
      byId: {},
      errorCode: null,
      errorMessage: null
    };
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value != null && String(value).trim() !== "") {
        return String(value);
      }
    }
    return "";
  }

  function normalizeMetricIdentity(_source) {
    var source = _source || {};
    return {
      code: firstNonEmpty(source.code, source.kennzahlCode),
      display: firstNonEmpty(source.display, source.kennzahlDisplay, source.title),
      metricsTable: firstNonEmpty(source.metricsTable, source.kennzahlenTable),
      langtext: firstNonEmpty(source.langtext),
      url: firstNonEmpty(source.url)
    };
  }

  function resolveMetricFromContentCreatePayload(_payload) {
    var payload = _payload || {};
    if (payload.metric && typeof payload.metric === "object") {
      return normalizeMetricIdentity(payload.metric);
    }
    var dropPayload = payload.payload || (payload.dropRequest && payload.dropRequest.payload) || {};
    return normalizeMetricIdentity(dropPayload);
  }

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
      var state = _state || createInitialWidgetVisState();
      var action = _action || {};
      var payload = action.payload || {};
      switch (action.type) {
        case ACTION_TYPES.MOUNT_STARTED:
          return Object.assign({}, state, { lifecycle: "initializing", errorCode: null, errorMessage: null });
        case ACTION_TYPES.MOUNT_SUCCEEDED:
          return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
        case ACTION_TYPES.REGISTER_CONTENT:
          return registerContent(state, action.widgetId, payload);
        case ACTION_TYPES.MARK_PENDING:
          return markPending(state, action.widgetId, payload);
        case ACTION_TYPES.APPLY_SUCCEEDED:
          return applySucceeded(state, action.widgetId, payload);
        case ACTION_TYPES.CLEANUP_SUCCEEDED:
          return cleanupSucceeded(state, action.widgetId, payload);
        case ACTION_TYPES.MAXIMIZE_SUCCEEDED:
          return maximizeSucceeded(state, action.widgetId, payload);
        case ACTION_TYPES.ERROR_RECORDED:
          return errorRecorded(state, action.widgetId, payload);
        case ACTION_TYPES.RECORD_REMOVED:
          return removeRecord(state, action.widgetId);
        case ACTION_TYPES.DESTROY:
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
    // A wholesale replace dropped the canonical derived defaults (topNResultValues, emptyStatus, ...) after contentCreate.
    var derived = Object.assign({}, existing.derived, record.derived || {});
    byId[_widgetId] = Object.assign({}, existing, record, { derived: derived, widgetId: _widgetId });
    return Object.assign({}, _state, { byId: byId });
  }

  function removeRecord(_state, _widgetId) {
    if (!_widgetId || !_state.byId[_widgetId]) {
      return _state;
    }
    var byId = Object.assign({}, _state.byId);
    delete byId[_widgetId];
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
    var derived = Object.assign({}, byId[_widgetId].derived, _data.cloneJson(_payload.derived || {}));
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

  return {
    ACTION_TYPES: ACTION_TYPES,
    createInitialWidgetVisState: createInitialWidgetVisState,
    createWidgetVisReducer: createWidgetVisReducer,
    cloneState: _data.cloneJson,
    normalizeMetricIdentity: normalizeMetricIdentity,
    resolveMetricFromContentCreatePayload: resolveMetricFromContentCreatePayload
  };
});
