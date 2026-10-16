define([
  "../state.js",
  "./handleContentCreate.js",
  "./handleWaitUntilContentReady.js",
  "../settings.js",
  "../render/displayOptions.js",
  "../binding/dienststelleChanged.js",
  "../topN/gate.js",
  "./handleCleanupContent.js",
  "../restore.js",
  "../focus/maximizeToggle.js",
  "./handleWidgetRuntimeLifecycle.js",
  "../results.js"
], function (
  _state,
  _handleContentCreate,
  _handleWaitUntilContentReady,
  _settings,
  _displayOptions,
  _dienststelleChanged,
  _topNGate,
  _handleCleanupContent,
  _restore,
  _maximizeToggle,
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
    routes[_state.ACTION_TYPES.APPLY_STARTUP_SETTINGS] = _settings.handleApplyStartupSettings;
    routes[_state.ACTION_TYPES.APPLY_DIMENSION] = _settings.handleApplySetting;
    routes[_state.ACTION_TYPES.APPLY_VIS_TYPE] = _settings.handleApplySetting;
    routes[_state.ACTION_TYPES.APPLY_TOPN_CHOICE] = _settings.handleApplySetting;
    routes[_state.ACTION_TYPES.APPLY_SHOW_VALUES] = _displayOptions.handleApplyShowValues;
    routes[_state.ACTION_TYPES.APPLY_GROUPING] = _settings.handleApplySetting;
    routes[_state.ACTION_TYPES.APPLY_ITERATOR_ZOOM] = _displayOptions.handleApplyIteratorZoom;
    routes[_state.ACTION_TYPES.DIENSTSTELLE_CHANGED] = _dienststelleChanged.handleDienststelleChanged;
    routes[_state.ACTION_TYPES.TOPN_RESOLVED] = _topNGate.handleTopNResolved;
    routes[_state.ACTION_TYPES.CLEANUP_CONTENT] = _handleCleanupContent;
    routes[_state.ACTION_TYPES.DISPOSE_WIDGET_RUNTIME] = _handleWidgetRuntimeLifecycle.handleDisposeWidgetRuntime;
    routes[_state.ACTION_TYPES.ENSURE_OBSERVERS] = _handleWidgetRuntimeLifecycle.handleEnsureObservers;
    routes[_state.ACTION_TYPES.PARAMETER_SET_BINDING] = _restore.handleParameterSetBinding;
    routes[_state.ACTION_TYPES.PARAMETER_SET_CANCEL_BINDINGS] = _restore.handleParameterSetCancelBindings;
    routes[_state.ACTION_TYPES.MAXIMIZE_TOGGLE] = _maximizeToggle.handleMaximizeToggle;
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
