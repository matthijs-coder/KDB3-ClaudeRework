define(["./config/actionTypes.js", "./state/selectors.js", "./effects/bindTabRenameEditSession.js", "./effects/mountTabsController.js", "./actions/dispatchTabsAction.js", "./actions/commitTabsState.js", "./runtime/cleanupTabsRuntime.js"], function (_actionTypes, _selectors, _bindTabRenameEditSession, _mountTabsController, _dispatchTabsAction, _commitTabsState, _cleanupTabsRuntime) {
  "use strict";

  function createTabsController(_deps) {
    const instance = { _KDB: _deps._KDB, adapter: _deps.adapter, startupPromise: null, isDisposed: false, didWarnDisposedMount: false, didWarnDisposedDispatch: false };
    instance.getState = getState.bind(null, instance);
    instance.dispatch = _dispatchTabsAction.bind(null, instance);
    return { mount: _mountTabsController.bind(null, instance), destroy: destroy.bind(null, instance), dispatch: instance.dispatch, getState: instance.getState };
  }

  function destroy(instance) {
    if (instance.isDisposed) { return; }
    instance.isDisposed = true;
    try {
      instance.startupPromise = null;
      _bindTabRenameEditSession.cleanupTabRenameEditSession(instance._KDB);
      _cleanupTabsRuntime(instance._KDB);
      _commitTabsState(instance, { type: _actionTypes.DESTROY, payload: { source: "destroy" } });
    } catch (err) {
      console.error("[tabs.destroy] destroy boundary failed", err);
      _commitTabsState(instance, buildErrorAction(err));
    }
  }

  function getState(instance) {
    try {
      if (instance.isDisposed) { return undefined; }
      return _selectors.readTabsState(instance._KDB);
    } catch (err) {
      console.error("[tabs.getState] read failed", err);
      return undefined;
    }
  }

  function buildErrorAction(err) { return { type: _actionTypes.ERROR, payload: { errorCode: "TABS_ERROR", errorMessage: err && err.message ? err.message : String(err || "Unknown tabs error.") } }; }

  return createTabsController;
});
