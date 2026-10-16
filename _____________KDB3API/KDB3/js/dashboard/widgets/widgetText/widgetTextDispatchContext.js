define([
  "./config/actionTypes.js",
  "./state/initialState.js",
  "./runtime/ensureWidgetRuntime.js"
], function (_actionTypes, _initialState, _ensureWidgetRuntime) {
  function validateAction(_action) {
    var action = _action || {};
    if (!action.type) {
      return { errorCode: "WIDGET_TEXT_UNKNOWN_ACTION" };
    }
    var perWidgetActions = [
      _actionTypes.CONTENT_CREATE,
      _actionTypes.COMMIT_TEXT_EDIT,
      _actionTypes.APPLY_FONT_SIZE,
      _actionTypes.APPLY_RESTYLE,
      _actionTypes.APPLY_TITLE,
      _actionTypes.APPLY_READABLE_TEXT_COLOR,
      _actionTypes.CLEANUP_CONTENT
    ];
    if (perWidgetActions.indexOf(action.type) >= 0 && !action.widgetId) {
      return { errorCode: "WIDGET_TEXT_WIDGET_ID_MISSING" };
    }
    if (action.widgetId && action.payload && action.payload.widgetId && action.widgetId !== action.payload.widgetId) {
      return { errorCode: "WIDGET_TEXT_WIDGET_ID_CONFLICT" };
    }
    return action;
  }

  function buildContext(_instance) {
    return {
      _KDB: _instance._KDB,
      options: _instance.options,
      selectors: _instance.selectors,
      widgetsFacet: _instance.widgetsFacet || null,
      actionTypes: _actionTypes,
      dispatchInternal: dispatchInternal.bind(null, _instance),
      ensureOpSeq: ensureOpSeq.bind(null, _instance),
      isStaleOpSeq: isStaleOpSeq.bind(null, _instance)
    };
  }

  function dispatchInternal(_instance, _action) {
    _instance._KDB.state.widgets.text = _instance.reducer(_instance._KDB.state.widgets.text, _action);
  }

  function ensureTextState(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
    if (!_KDB.state.widgets.text) {
      _KDB.state.widgets.text = _initialState();
    }
  }

  function ensureOpSeq(_instance, _widgetId, _requestedOpSeq) {
    var runtime = _ensureWidgetRuntime(_instance._KDB, _widgetId);
    if (typeof _requestedOpSeq === "number") {
      runtime.opSeq = _requestedOpSeq;
      return _requestedOpSeq;
    }
    runtime.opSeq = (runtime.opSeq || 0) + 1;
    return runtime.opSeq;
  }

  function isStaleOpSeq(_instance, _widgetId, _opSeq) {
    var runtimeRoot = _instance._KDB.runtime && _instance._KDB.runtime.widgetText;
    var runtime = runtimeRoot && runtimeRoot.byId ? runtimeRoot.byId[_widgetId] : null;
    if (!runtime || typeof _opSeq !== "number") {
      return false;
    }
    return runtime.opSeq !== _opSeq;
  }

  function warnDisposed(_instance, _methodName) {
    if (_methodName === "mount" && !_instance.didWarnDisposedMount) {
      console.warn("[widgetText.mount] called after destroy; obtain a fresh instance from the factory");
      _instance.didWarnDisposedMount = true;
    }
    if (_methodName === "dispatch" && !_instance.didWarnDisposedDispatch) {
      console.warn("[widgetText.dispatch] called after destroy");
      _instance.didWarnDisposedDispatch = true;
    }
  }

  return {
    validateAction: validateAction,
    buildContext: buildContext,
    dispatchInternal: dispatchInternal,
    ensureTextState: ensureTextState,
    ensureOpSeq: ensureOpSeq,
    isStaleOpSeq: isStaleOpSeq,
    warnDisposed: warnDisposed
  };
});
