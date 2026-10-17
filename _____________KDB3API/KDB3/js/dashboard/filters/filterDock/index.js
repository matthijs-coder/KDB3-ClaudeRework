define([
  "./state.js",
  "./selectors.js",
  "./config.js",
  "./chromeWait.js",
  "./interaction/dockClick.js",
  "./interaction/dockDom.js",
  "./interaction/popupCommands.js",
  "./observation/dockObserver.js",
  "./observation/filtersReady.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js"
], function (
  _state,
  _selectors,
  _config,
  _chromeWait,
  _dockClick,
  _dockDom,
  _popupCommands,
  _dockObserver,
  _filtersReady,
  _rt,
  _errors
) {
  "use strict";

  // Lifecycle terms for filterDock: idle, ready, error, disposed.
  //
  // Other modules read the dock through selectors.js (no clone, no extra API methods; a feature API publishes
  // mount, destroy, dispatch and getState only):
  //   readActiveFilterEl(_KDB)    -> the dock filter element of the last click, or null
  //   readFiltersReadyFlag(_KDB)  -> true once the dock reported its filters ready
  //   readFilterDockState(_KDB), readPopupState(_KDB), readLastClickedFilter(_KDB), readLastInteraction(_KDB)
  // dispatch({type: "filterDock/clickOriginalButtonRequested"}) returns the usual state snapshot with an extra
  // own property `ok` (true when the original popup button was clicked). All other actions return what they did.

  var OWNER_FIELDS = [
    "pendingEvaluationMerge",
    "popupReadyState",
    "filtersReadyDispatched",
    "filtersReadyWatch",
    "popupDisplayResyncSession",
    "popupDisplayResyncPendingSource",
    "diagnostics"
  ];

  function mergeMissingKeys(target, source) {
    Object.keys(source).forEach(function (key) {
      if (target[key] === undefined) {
        target[key] = source[key];
      }
    });
    return target;
  }

  function createDockController(_KDB, runtime) {
    var guard = _errors.createDisposedGuard("filterDock");
    var ctx = { _KDB: _KDB, runtime: runtime, dispatch: dispatchInternal, isDisposed: guard.isDisposed };

    function dispatchInternal(action) {
      var filtersState = _KDB.state && _KDB.state.filters;
      if (!filtersState) {
        return;
      }
      if (
        action &&
        (action.type === _state.ACTIONS.CLICK_ORIGINAL_BUTTON_REQUESTED ||
          action.type === _state.ACTIONS.CLOSE_ACTIVE_POPUP_REQUESTED)
      ) {
        return _popupCommands.runPopupCommand(_KDB, action);
      }
      filtersState.filterDock = _state.reduceFilterDockState(filtersState.filterDock, action);
    }

    function recordError(errorCode, error) {
      dispatchInternal({
        type: _state.ACTIONS.ERROR,
        payload: { errorCode: errorCode, errorMessage: error && error.message ? error.message : String(error) }
      });
    }

    function handleBoundaryError(methodName, error) {
      console.error("[filterDock." + methodName + "] failed", error);
      recordError("FILTER_DOCK_" + methodName.toUpperCase() + "_FAILED", error);
      return false;
    }

    function handleMountFailure(error) {
      if (error && error.code === "ABORTED") {
        return false;
      }
      console.error("[filterDock.mount] filter dock wait failed", error);
      if (!guard.isDisposed()) {
        recordError(
          error && error.code === _config.ERROR_CHROME_WAIT_TIMEOUT ? _config.ERROR_CHROME_WAIT_TIMEOUT : _config.ERROR_MOUNT_FAILED,
          error
        );
      }
      return false;
    }

    // Async boundary of mount: binds the dock once the Cognos chrome exists.
    function finishMount() {
      var dockRoot = _dockDom.readDockRoot(_KDB);
      if (!dockRoot) {
        console.warn("[filterDock.mount] dock root not found");
        return false;
      }
      try {
        _dockClick.bindDockClick(ctx, dockRoot);
        _dockObserver.bindDockObserver(ctx, dockRoot);
        _filtersReady.detectFiltersReady(ctx, dockRoot);
      } catch (error) {
        console.error("[filterDock.mount] bind failed", error);
        _dockClick.unbindDockClick(runtime);
        _dockObserver.unbindDockObserver(runtime);
        return false;
      }
      dispatchInternal({ type: _state.ACTIONS.MOUNT_SUCCEEDED, payload: { mountedAt: Date.now() } });
      return true;
    }

    function mount() {
      var scope;
      if (guard.blocked("mount")) {
        return false;
      }
      try {
        if (runtime.pendingPromises.mount) {
          return true;
        }
        scope = new AbortController();
        runtime.abortControllers.mount = scope;
        runtime.pendingPromises.mount = _chromeWait.waitForDockChrome(_KDB, scope.signal)
          .then(function () {
            return guard.isDisposed() || scope.signal.aborted ? false : finishMount();
          })
          .catch(handleMountFailure)
          .finally(function () {
            runtime.pendingPromises.mount = null;
            delete runtime.abortControllers.mount;
          });
        return true;
      } catch (error) {
        return handleBoundaryError("mount", error);
      }
    }

    function destroy() {
      var errors;
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      try {
        errors = _rt.disposeRuntimeBuckets(runtime);
        OWNER_FIELDS.forEach(function (field) {
          delete runtime[field];
        });
        if (errors.length) {
          console.error("[filterDock.destroy] cleanup errors", errors);
        }
        dispatchInternal({ type: _state.ACTIONS.DESTROY, payload: {} });
      } catch (error) {
        console.error("[filterDock.destroy] failed", error);
      }
    }

    function dispatch(action) {
      if (guard.blocked("dispatch")) {
        return undefined;
      }
      try {
        var handled = dispatchInternal(action);
        var snapshot = _selectors.readFilterDockState(_KDB);
        if (action && action.type === _state.ACTIONS.CLICK_ORIGINAL_BUTTON_REQUESTED) {
          return Object.assign(snapshot || {}, { ok: handled === true });
        }
        return snapshot;
      } catch (error) {
        handleBoundaryError("dispatch", error);
        return undefined;
      }
    }

    function getState() {
      return guard.isDisposed() ? undefined : _selectors.readFilterDockState(_KDB);
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function registerFilterDock(_KDB) {
    var runtime;
    _KDB.state.filters = _KDB.state.filters || {};

    if (!_KDB.state.filters.filterDock) {
      _KDB.state.filters.filterDock = _state.createInitialFilterDockState();
    }
    runtime = _rt.ensureRuntime(_KDB, "filterDock");
    _KDB.elements.selectors.filterDock = mergeMissingKeys(
      _KDB.elements.selectors.filterDock || {},
      _config.DOCK_SELECTOR_DEFAULTS
    );

    _KDB.api.filterDock = createDockController(_KDB, runtime);
    return _KDB.api.filterDock;
  }

  return registerFilterDock;
});
