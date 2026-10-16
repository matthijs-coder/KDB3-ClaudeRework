define([
  "./config/actionTypes.js",
  "./state/initialState.js",
  "./state/createWidgetBaseReducer.js",
  "./state/cloneSerializable.js",
  "./state/selectors.js",
  "./state/ensureWidgetBaseRuntime.js",
  "../../launchpad/state/selectors.js",
  "./effects/subscribeDropValidated.js",
  "./effects/subscribeTabsChanged.js",
  "./effects/cleanupWidgetRuntime.js",
  "./effects/mountStartup.js",
  "./actions/handleDropCreate.js",
  "./actions/handleRouteAllToLaunchpad.js",
  "./actions/handleEnsureTabWidgetsRouted.js",
  "./actions/handleRenderTabWidgets.js",
  "./actions/handleRouteToLaunchpad.js",
  "./actions/handleTakeFromLaunchpad.js",
  "./actions/handleMoveOrResize.js",
  "./actions/handleMoveMode.js",
  "./actions/handleResizeToggle.js",
  "./actions/handleSetColour.js",
  "./actions/handleRemove.js",
  "./actions/handleParameterSetReset.js",
  "./actions/handleParameterSetRestore.js",
  "./actions/handlePrepareTabMutation.js",
  "./actions/handleApplyTabMutation.js",
  "./actions/handleRestoreTabMutationSnapshot.js",
  "./actions/normalizeDispatchResult.js"
], function (
  _actionTypes, _initialState, _createWidgetBaseReducer, _cloneSerializable, _selectors, _ensureWidgetBaseRuntime, _launchpadSelectors,
  _subscribeDropValidated, _subscribeTabsChanged, _cleanupModule, _mountStartup, _handleDropCreate, _handleRouteAllToLaunchpad, _handleEnsureTabWidgetsRouted, _handleRenderTabWidgets, _handleRouteToLaunchpad,
  _handleTakeFromLaunchpad, _handleMoveOrResize, _handleMoveMode, _handleResizeToggle, _handleSetColour, _handleRemove, _handleParameterSetReset, _handleParameterSetRestore,
  _handlePrepareTabMutation, _handleApplyTabMutation, _handleRestoreTabMutationSnapshot, _normalizeDispatchResult
) {
  function createWidgetBaseController(_deps) {
    const instance = { _KDB: _deps._KDB, options: _deps.options || {}, selectors: _deps.selectors || _selectors, widgetsFacet: _deps.widgetsFacet || null, canvasFacet: _deps.canvasFacet || null, reducer: _createWidgetBaseReducer(), isDisposed: false, didWarnDisposedMount: false, didWarnDisposedDispatch: false };
    _ensureWidgetBaseRuntime.ensureWidgetBaseRuntime(instance._KDB);
    return { mount: mount.bind(null, instance), destroy: destroy.bind(null, instance), dispatch: dispatch.bind(null, instance), getState: getState.bind(null, instance) };
  }
  function mount(instance, _options) {
    if (instance.isDisposed) { warnDisposed(instance, "mount"); return Promise.resolve(false); }
    try {
      dispatchInternal(instance, { type: _actionTypes.MOUNT_STARTED });
      ensureBaseState(instance._KDB);
      _ensureWidgetBaseRuntime.ensureWidgetBaseRuntime(instance._KDB);
      const subscriptions = instance._KDB.runtime.widgetBase.subscriptions;
      if (typeof subscriptions.dropValidated === "function") {
        subscriptions.dropValidated();
        delete subscriptions.dropValidated;
      }
      subscriptions.dropValidated = _subscribeDropValidated(instance._KDB, dispatch.bind(null, instance));
      if (typeof subscriptions.tabsChanged === "function") {
        subscriptions.tabsChanged();
        delete subscriptions.tabsChanged;
      }
      subscriptions.tabsChanged = _subscribeTabsChanged(instance._KDB, dispatch.bind(null, instance));
      dispatchInternal(instance, { type: _actionTypes.MOUNT_SUCCEEDED });
      const options = Object.assign({}, instance.options, _options || {});
      if (options.autoRouteAll === false) { return Promise.resolve(true); }
      return _mountStartup(instance, dispatch.bind(null, instance), dispatchInternal.bind(null, instance), options);
    } catch (err) {
      console.error("[widgetBase.mount] mount boundary failed", err);
      dispatchInternal(instance, { type: _actionTypes.ERROR_RECORDED, payload: { errorCode: "WIDGET_BASE_MOUNT_FAILED", errorMessage: String(err && err.message ? err.message : err) } });
      return Promise.resolve(false);
    }
  }
  function destroy(instance) {
    if (instance.isDisposed) { return; }
    instance.isDisposed = true;
    try { _cleanupModule.destroyWidgetBaseModule(instance._KDB); dispatchInternal(instance, { type: _actionTypes.DESTROY }); }
    catch (err) { console.error("[widgetBase.destroy] destroy boundary failed", err); }
  }
  function dispatch(instance, _action) {
    if (instance.isDisposed) { warnDisposed(instance, "dispatch"); return Promise.resolve(_normalizeDispatchResult({ ok: false, outcome: "aborted", reason: "disposed", errorCode: "WIDGET_BASE_DESTROY_FAILED" })); }
    const action = validateAction(_action);
    if (action.errorCode) { return Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: action.errorCode })); }
    const context = buildContext(instance);
    if (action.type === _actionTypes.REPORT_ERROR) {
      dispatchInternal(instance, { type: _actionTypes.ERROR_RECORDED, widgetId: action.widgetId, payload: action.payload || {} });
      return Promise.resolve(_normalizeDispatchResult({ ok: true }));
    }
    return routeAction(context, action);
  }
  function routeAction(context, action) {
    const routes = {};
    routes[_actionTypes.DROP_CREATE] = _handleDropCreate;
    routes[_actionTypes.ROUTE_ALL_TO_LAUNCHPAD] = _handleRouteAllToLaunchpad;
    routes[_actionTypes.ENSURE_TAB_WIDGETS_ROUTED] = _handleEnsureTabWidgetsRouted;
    routes[_actionTypes.RENDER_TAB_WIDGETS] = _handleRenderTabWidgets;
    routes[_actionTypes.ROUTE_TO_LAUNCHPAD] = _handleRouteToLaunchpad;
    routes[_actionTypes.TAKE_FROM_LAUNCHPAD] = _handleTakeFromLaunchpad;
    routes[_actionTypes.ENABLE_MOVE] = _handleMoveMode;
    routes[_actionTypes.SET_MOVE_MODE] = _handleMoveMode;
    routes[_actionTypes.RESIZE_TOGGLE] = _handleResizeToggle;
    routes[_actionTypes.MOVE] = _handleMoveOrResize;
    routes[_actionTypes.RESIZE] = _handleMoveOrResize;
    routes[_actionTypes.SET_COLOUR] = _handleSetColour;
    routes[_actionTypes.APPLY_COLOUR] = _handleSetColour;
    routes[_actionTypes.REMOVE] = _handleRemove;
    routes[_actionTypes.PARAMETER_SET_RESET] = _handleParameterSetReset;
    routes[_actionTypes.PARAMETER_SET_RESTORE] = _handleParameterSetRestore;
    routes[_actionTypes.PREPARE_TAB_MUTATION] = _handlePrepareTabMutation;
    routes[_actionTypes.APPLY_TAB_MUTATION] = _handleApplyTabMutation;
    routes[_actionTypes.RESTORE_TAB_MUTATION_SNAPSHOT] = _handleRestoreTabMutationSnapshot;
    const handler = routes[action.type];
    return handler ? handler(context, action) : Promise.resolve(_normalizeDispatchResult({ ok: false, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Unknown widgetBase action." }));
  }
  function getState(instance) {
    if (instance.isDisposed) { return undefined; }
    return _cloneSerializable(instance._KDB.state.widgets.base);
  }
  function buildContext(instance) {
    return { _KDB: instance._KDB, selectors: instance.selectors, actionTypes: _actionTypes, widgetsFacet: instance.widgetsFacet, canvasFacet: instance.canvasFacet, dispatch: dispatch.bind(null, instance), dispatchInternal: dispatchInternal.bind(null, instance), ensureOpSeq: ensureOpSeq.bind(null, instance), isStaleOpSeq: isStaleOpSeq.bind(null, instance), isLaunchpadReady: function () { return _launchpadSelectors.readLaunchpadReady(instance._KDB) === true; } };
  }
  function dispatchInternal(instance, _action) { instance._KDB.state.widgets.base = instance.reducer(instance._KDB.state.widgets.base, _action); }
  function validateAction(_action) {
    const action = _action || {};
    if (action.widgetId && action.payload && action.payload.widgetId && action.widgetId !== action.payload.widgetId) { return { errorCode: "WIDGET_BASE_WIDGET_ID_CONFLICT" }; }
    return action;
  }
  function ensureOpSeq(instance, widgetId, requestedOpSeq) {
    _ensureWidgetBaseRuntime.ensureWidgetBaseWidgetRuntime(instance._KDB, widgetId);
    const runtime = instance._KDB.runtime.widgetBase.byId[widgetId];
    if (typeof requestedOpSeq === "number") { runtime.opSeq = requestedOpSeq; return requestedOpSeq; }
    runtime.opSeq = (runtime.opSeq || 0) + 1;
    return runtime.opSeq;
  }
  function isStaleOpSeq(instance, widgetId, opSeq) {
    const runtime = instance._KDB.runtime.widgetBase.byId[widgetId];
    return !runtime || runtime.opSeq !== opSeq;
  }
  function ensureBaseState(_KDB) { _KDB.state.widgets = _KDB.state.widgets || {}; if (!_KDB.state.widgets.base) { _KDB.state.widgets.base = _initialState(); } }
  function warnDisposed(instance, methodName) {
    if (methodName === "mount" && !instance.didWarnDisposedMount) { console.warn("[widgetBase.mount] called after destroy; obtain a fresh instance from the factory"); instance.didWarnDisposedMount = true; }
    if (methodName === "dispatch" && !instance.didWarnDisposedDispatch) { console.warn("[widgetBase.dispatch] called after destroy"); instance.didWarnDisposedDispatch = true; }
  }
  return createWidgetBaseController;
});
