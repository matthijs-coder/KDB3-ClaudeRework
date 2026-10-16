define([
  "../state.js",
  "./handleContentCreate.js",
  "./handleWaitUntilContentReady.js",
  "./handleApplySetting.js",
  "./handleApplyShowValues.js",
  "./handleApplyStartupSettings.js",
  "./handleDienststelleChanged.js",
  "./handleTopNResolved.js",
  "./handleCleanupContent.js",
  "./handleParameterSetBinding.js",
  "./handleParameterSetCancelBindings.js",
  "./handleMaximizeToggle.js",
  "./handleWidgetRuntimeLifecycle.js",
  "../results.js"
], function (
  _state,
  _handleContentCreate,
  _handleWaitUntilContentReady,
  _handleApplySetting,
  _handleApplyShowValues,
  _handleApplyStartupSettings,
  _handleDienststelleHandlers,
  _handleTopNResolved,
  _handleCleanupContent,
  _handleParameterSetBinding,
  _handleParameterSetCancelBindings,
  _handleMaximizeToggle,
  _handleWidgetRuntimeLifecycle,
  _results
) {
  "use strict";

  function handleError(_context, _action) {
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.ERROR_RECORDED,
      widgetId: _action.widgetId,
      payload: _action.payload || {}
    });
    return { ok: true, widgetId: _action.widgetId };
  }

  function routeAction(_context, _action) {
    var routes = {};
    routes[_state.ACTION_TYPES.CONTENT_CREATE] = _handleContentCreate;
    routes[_state.ACTION_TYPES.WAIT_UNTIL_CONTENT_READY] = _handleWaitUntilContentReady;
    routes[_state.ACTION_TYPES.APPLY_STARTUP_SETTINGS] = _handleApplyStartupSettings.handleApplyStartupSettings;
    routes[_state.ACTION_TYPES.APPLY_DIMENSION] = _handleApplySetting;
    routes[_state.ACTION_TYPES.APPLY_VIS_TYPE] = _handleApplySetting;
    routes[_state.ACTION_TYPES.APPLY_TOPN_CHOICE] = _handleApplySetting;
    routes[_state.ACTION_TYPES.APPLY_SHOW_VALUES] = _handleApplyShowValues;
    routes[_state.ACTION_TYPES.APPLY_GROUPING] = _handleApplySetting;
    routes[_state.ACTION_TYPES.APPLY_ITERATOR_ZOOM] = _handleApplyStartupSettings.handleApplyIteratorZoom;
    routes[_state.ACTION_TYPES.DIENSTSTELLE_CHANGED] = _handleDienststelleHandlers.handleDienststelleChanged;
    routes[_state.ACTION_TYPES.TOPN_RESOLVED] = _handleTopNResolved;
    routes[_state.ACTION_TYPES.CLEANUP_CONTENT] = _handleCleanupContent;
    routes[_state.ACTION_TYPES.DISPOSE_WIDGET_RUNTIME] = _handleWidgetRuntimeLifecycle.handleDisposeWidgetRuntime;
    routes[_state.ACTION_TYPES.ENSURE_OBSERVERS] = _handleWidgetRuntimeLifecycle.handleEnsureObservers;
    routes[_state.ACTION_TYPES.PARAMETER_SET_BINDING] = _handleParameterSetBinding;
    routes[_state.ACTION_TYPES.PARAMETER_SET_CANCEL_BINDINGS] = _handleParameterSetCancelBindings;
    routes[_state.ACTION_TYPES.MAXIMIZE_TOGGLE] = _handleMaximizeToggle;
    routes[_state.ACTION_TYPES.ERROR] = handleError;
    var handler = routes[_action.type];
    if (!handler) {
      return Promise.resolve(_results.normalizeDispatchResult({
        ok: false,
        errorCode: "WIDGET_VIS_UNKNOWN_ACTION",
        errorMessage: "Unknown widgetVis action: " + String(_action.type || "")
      }));
    }
    return Promise.resolve(handler(_context, _action)).then(_results.normalizeDispatchResult);
  }

  return routeAction;
});
