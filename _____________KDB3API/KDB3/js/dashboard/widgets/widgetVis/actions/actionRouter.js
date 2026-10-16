define([
  "../config/actionTypes.js",
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
  "./normalizeDispatchResult.js"
], function (
  _actionTypes,
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
  _normalizeDispatchResult
) {
  "use strict";

  function handleError(_context, _action) {
    _context.dispatchInternal({
      type: _actionTypes.ERROR_RECORDED,
      widgetId: _action.widgetId,
      payload: _action.payload || {}
    });
    return { ok: true, widgetId: _action.widgetId };
  }

  function routeAction(_context, _action) {
    var routes = {};
    routes[_actionTypes.CONTENT_CREATE] = _handleContentCreate;
    routes[_actionTypes.WAIT_UNTIL_CONTENT_READY] = _handleWaitUntilContentReady;
    routes[_actionTypes.APPLY_STARTUP_SETTINGS] = _handleApplyStartupSettings.handleApplyStartupSettings;
    routes[_actionTypes.APPLY_DIMENSION] = _handleApplySetting;
    routes[_actionTypes.APPLY_VIS_TYPE] = _handleApplySetting;
    routes[_actionTypes.APPLY_TOPN_CHOICE] = _handleApplySetting;
    routes[_actionTypes.APPLY_SHOW_VALUES] = _handleApplyShowValues;
    routes[_actionTypes.APPLY_GROUPING] = _handleApplySetting;
    routes[_actionTypes.APPLY_ITERATOR_ZOOM] = _handleApplyStartupSettings.handleApplyIteratorZoom;
    routes[_actionTypes.DIENSTSTELLE_CHANGED] = _handleDienststelleHandlers.handleDienststelleChanged;
    routes[_actionTypes.TOPN_RESOLVED] = _handleTopNResolved;
    routes[_actionTypes.CLEANUP_CONTENT] = _handleCleanupContent;
    routes[_actionTypes.DISPOSE_WIDGET_RUNTIME] = _handleWidgetRuntimeLifecycle.handleDisposeWidgetRuntime;
    routes[_actionTypes.ENSURE_OBSERVERS] = _handleWidgetRuntimeLifecycle.handleEnsureObservers;
    routes[_actionTypes.PARAMETER_SET_BINDING] = _handleParameterSetBinding;
    routes[_actionTypes.PARAMETER_SET_CANCEL_BINDINGS] = _handleParameterSetCancelBindings;
    routes[_actionTypes.MAXIMIZE_TOGGLE] = _handleMaximizeToggle;
    routes[_actionTypes.ERROR] = handleError;
    var handler = routes[_action.type];
    if (!handler) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        errorCode: "WIDGET_VIS_UNKNOWN_ACTION",
        errorMessage: "Unknown widgetVis action: " + String(_action.type || "")
      }));
    }
    return Promise.resolve(handler(_context, _action)).then(_normalizeDispatchResult);
  }

  return routeAction;
});
