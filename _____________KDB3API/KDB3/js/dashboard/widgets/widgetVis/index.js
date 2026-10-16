define([
  "./state.js",
  "./selectors.js",
  "./runtime.js",
  "./results.js",
  "./context.js",
  "./lifecycle.js",
  "./cleanup.js",
  "./settings.js",
  "./restore.js",
  "./binding/dienststelleChanged.js",
  "./topN/gate.js",
  "./topN/filtersConfirmed.js",
  "./render/displayOptions.js",
  "./focus/maximizeToggle.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js"
], function (
  _state,
  _selectors,
  _visRuntime,
  _results,
  _visContext,
  _lifecycle,
  _cleanup,
  _settings,
  _restore,
  _dienststelleChanged,
  _topNGate,
  _filtersConfirmed,
  _displayOptions,
  _maximizeToggle,
  _data,
  _kitRuntime,
  _errors
) {
  "use strict";
  // Lifecycle terms for widgetVis: idle, ready, error, disposed.

  var TYPES = _state.ACTION_TYPES;

  function handleError(_context, _action) {
    _context.dispatchInternal({ type: TYPES.ERROR_RECORDED, widgetId: _action.widgetId, payload: _action.payload || {} });
    return { ok: true, widgetId: _action.widgetId };
  }

  var ROUTES = {};
  ROUTES[TYPES.CONTENT_CREATE] = _lifecycle.handleContentCreate;
  ROUTES[TYPES.WAIT_UNTIL_CONTENT_READY] = _lifecycle.handleWaitUntilContentReady;
  ROUTES[TYPES.APPLY_STARTUP_SETTINGS] = _settings.handleApplyStartupSettings;
  ROUTES[TYPES.APPLY_DIMENSION] = _settings.handleApplySetting;
  ROUTES[TYPES.APPLY_VIS_TYPE] = _settings.handleApplySetting;
  ROUTES[TYPES.APPLY_TOPN_CHOICE] = _settings.handleApplySetting;
  ROUTES[TYPES.APPLY_SHOW_VALUES] = _displayOptions.handleApplyShowValues;
  ROUTES[TYPES.APPLY_GROUPING] = _settings.handleApplySetting;
  ROUTES[TYPES.APPLY_ITERATOR_ZOOM] = _displayOptions.handleApplyIteratorZoom;
  ROUTES[TYPES.DIENSTSTELLE_CHANGED] = _dienststelleChanged.handleDienststelleChanged;
  ROUTES[TYPES.TOPN_RESOLVED] = _topNGate.handleTopNResolved;
  ROUTES[TYPES.CLEANUP_CONTENT] = _cleanup.handleCleanupContent;
  ROUTES[TYPES.DISPOSE_WIDGET_RUNTIME] = _lifecycle.handleDisposeWidgetRuntime;
  ROUTES[TYPES.ENSURE_OBSERVERS] = _lifecycle.handleEnsureObservers;
  ROUTES[TYPES.PARAMETER_SET_BINDING] = _restore.handleParameterSetBinding;
  ROUTES[TYPES.PARAMETER_SET_CANCEL_BINDINGS] = _restore.handleParameterSetCancelBindings;
  ROUTES[TYPES.MAXIMIZE_TOGGLE] = _maximizeToggle.handleMaximizeToggle;
  ROUTES[TYPES.ERROR] = handleError;

  function routeAction(_context, _action) {
    var handler = ROUTES[_action.type];
    if (!handler) {
      return Promise.resolve(_results.normalizeDispatchResult({
        ok: false,
        errorCode: "WIDGET_VIS_UNKNOWN_ACTION",
        errorMessage: "Unknown widgetVis action: " + String(_action.type || "")
      }));
    }
    return Promise.resolve(handler(_context, _action)).then(_results.normalizeDispatchResult);
  }

  function errorMessageOf(_err) {
    return String(_err && _err.message ? _err.message : _err);
  }

  function createWidgetVisController(_KDB, _options) {
    var guard = _errors.createDisposedGuard("widgetVis");
    var instance = {
      _KDB: _KDB,
      options: _options || {},
      selectors: _selectors,
      reducer: _state.createWidgetVisReducer(),
      get isDisposed() {
        return guard.isDisposed();
      },
      dispatchInternal: function (_action) {
        _visContext.dispatchInternal(instance, _action);
      }
    };

    function recordError(_errorCode, _err) {
      instance.dispatchInternal({ type: TYPES.ERROR_RECORDED, payload: { errorCode: _errorCode, errorMessage: errorMessageOf(_err) } });
    }

    function mount(_mountOptions) {
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        _visContext.ensureVisState(_KDB);
        _visRuntime.initializeRuntime(_KDB).enableDrillthrough = (_mountOptions || {}).enableDrillthrough !== false;
        _filtersConfirmed.subscribe(_KDB);
        instance.dispatchInternal({ type: TYPES.MOUNT_STARTED });
        instance.dispatchInternal({ type: TYPES.MOUNT_SUCCEEDED });
        return true;
      } catch (err) {
        console.error("[widgetVis.mount] failed", err);
        recordError("WIDGET_VIS_MOUNT_FAILED", err);
        return false;
      }
    }

    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        _lifecycle.disposeModuleRuntime(_KDB);
        instance.dispatchInternal({ type: TYPES.DESTROY });
      } catch (err) {
        console.error("[widgetVis.destroy] failed", err);
        recordError("WIDGET_VIS_DESTROY_FAILED", err);
      }
    }

    function convertRejection(_promise) {
      return _promise.catch(function (err) {
        console.error("[widgetVis.dispatch] failed", err);
        recordError("WIDGET_VIS_MOUNT_FAILED", err);
        return _results.normalizeDispatchResult({ ok: false, errorCode: "WIDGET_VIS_MOUNT_FAILED" });
      });
    }

    function dispatch(_action) {
      if (guard.blocked("dispatch")) {
        return Promise.resolve(_results.normalizeDispatchResult({ ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }));
      }
      try {
        var action = _visContext.validateAction(_action);
        if (action.errorCode) {
          return Promise.resolve(_results.normalizeDispatchResult({ ok: false, errorCode: action.errorCode }));
        }
        var context = _visContext.buildContext(instance);
        if (action.type === TYPES.DIENSTSTELLE_CHANGED && !action.widgetId) {
          return convertRejection(_dienststelleChanged.broadcastDienststelleChanged(context, action).then(_results.normalizeDispatchResult));
        }
        return action.type === TYPES.DIENSTSTELLE_CHANGED ? convertRejection(routeAction(context, action)) : routeAction(context, action);
      } catch (err) {
        console.error("[widgetVis.dispatch] failed", err);
        recordError("WIDGET_VIS_MOUNT_FAILED", err);
        return Promise.resolve(_results.normalizeDispatchResult({ ok: false, errorCode: "WIDGET_VIS_MOUNT_FAILED" }));
      }
    }

    function getState() {
      if (guard.isDisposed()) {
        return undefined;
      }
      try {
        return _data.cloneJson(_KDB.state.widgets.vis);
      } catch (err) {
        console.error("[widgetVis.getState] failed", err);
        return undefined;
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function stampHostFacets(_KDB) {
    var host = _KDB.services && _KDB.services.cognosHost ? _KDB.services.cognosHost : null;
    var tableData = _KDB.services && _KDB.services.tableData ? _KDB.services.tableData : null;
    var runtime = _kitRuntime.ensureRuntime(_KDB, "widgetVis");
    runtime.visualizationFacet = host && host.visualization ? host.visualization : null;
    runtime.widgetsFacet = host && host.widgets ? host.widgets : null;
    runtime.filtersFacet = host && host.filters ? host.filters : null;
    runtime.drillthroughService = _KDB.services && _KDB.services.drillthrough ? _KDB.services.drillthrough : null;
    runtime.tableDataReadRows = tableData && typeof tableData.readRows === "function" ? tableData.readRows.bind(tableData) : null;
    runtime.dataQueryFacet = host && host.dataQuery ? host.dataQuery : null;
  }

  function registerWidgetVis(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.api = _KDB.api || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
    stampHostFacets(_KDB);
    var controller = createWidgetVisController(_KDB, _options);
    _KDB.api.widgetVis = controller;
    return controller;
  }

  return registerWidgetVis;
});
