define([
  "./config.js",
  "./state.js",
  "./state/selectors.js",
  "./buildLaunchpadTabs.js",
  "./view.js",
  "./effects.js",
  "../../core/utils/kit/errors.js"
], function (_config, _state, _selectors, _buildLaunchpadTabs, _view, _effects, _errors) {
  "use strict";
  // Lifecycle terms: idle, initializing, ready, error, disposed.
  const ACTION_TYPES = _config.ACTION_TYPES;

  function registerLaunchpad(_KDB, _options) {
    ensureNamespaces(_KDB);
    if (!_KDB.elements.selectors.launchpad) {
      _KDB.elements.selectors.launchpad = _config.DOM_SELECTORS;
    }
    if (!_KDB.state.launchpad) {
      _KDB.state.launchpad = _state.createInitialLaunchpadState();
    }
    const runtime = ensureLaunchpadRuntime(_KDB);
    const cognosHost = _KDB.services ? _KDB.services.cognosHost : null;
    runtime.canvasFacet = cognosHost && cognosHost.canvas ? cognosHost.canvas : null;
    runtime.tabsFacet = cognosHost && cognosHost.tabs ? cognosHost.tabs : null;

    const controller = createLaunchpadController(_KDB, _options || {});
    _KDB.api.launchpad = controller;
    return controller;
  }

  function ensureNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
  }

  // Only the buckets launchpad uses: domRefs (DOM handles) and pendingPromises (mount, waitUntilReady).
  // The facet stamps live next to them and are never replaced.
  function ensureLaunchpadRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    const runtime = _KDB.runtime.launchpad || (_KDB.runtime.launchpad = {});
    runtime.domRefs = runtime.domRefs || {};
    runtime.pendingPromises = runtime.pendingPromises || {};
    return runtime;
  }

  function createLaunchpadController(_KDB, controllerOptions) {
    const guard = _errors.createDisposedGuard("launchpad");

    // ---- mount ---------------------------------------------------------------

    function mount(_mountOptions) {
      const runtime = ensureLaunchpadRuntime(_KDB);
      if (guard.blocked("mount")) { return Promise.resolve(false); }
      if (isMountedAndReady()) { return Promise.resolve(true); }
      if (runtime.pendingPromises.mount) { return runtime.pendingPromises.mount; }
      try {
        dispatchState({ type: ACTION_TYPES.MOUNT_STARTED });
        // The settled promise stays in pendingPromises.mount until destroy: later mount() and
        // waitUntilReady() calls reuse its result, so a failed mount is not retried.
        runtime.pendingPromises.mount = Promise.resolve(runMountPipeline(Object.assign({}, controllerOptions, _mountOptions || {})));
        return runtime.pendingPromises.mount;
      } catch (err) {
        dispatchState(buildMountFailedAction(err));
        console.error("[launchpad.mount] mount boundary failed", err);
        return Promise.resolve(false);
      }
    }

    function runMountPipeline(options) {
      try {
        const tabModel = _buildLaunchpadTabs(_KDB, options);
        const buildResult = _view.buildLaunchpadDom(_KDB, tabModel, options);
        validateBuildResult(buildResult);
        if (_view.placeLaunchpadDom(_KDB, buildResult) !== true) {
          throw new Error("Launchpad DOM placement failed.");
        }
        dispatchState(buildMountSucceededAction(buildResult));
        return true;
      } catch (err) {
        console.error("[launchpad.runMountPipeline] mount pipeline failed", err);
        dispatchState(buildMountFailedAction(err));
        return false;
      }
    }

    // ---- dispatch ------------------------------------------------------------

    function dispatch(_action) {
      const action = _action || {};
      if (guard.isDisposed() && action.type !== ACTION_TYPES.DESTROY) {
        guard.blocked("dispatch");
        return buildDisposedDispatchResult(action);
      }
      if (action.type === ACTION_TYPES.WAIT_UNTIL_READY) { return waitUntilReady(); }
      if (action.type === ACTION_TYPES.READ_SLOT_WIDGETS) {
        return Promise.resolve(_effects.readSlotWidgets(_KDB, action.payload || {}));
      }
      dispatchState(action);
      return _KDB.state.launchpad;
    }

    function buildDisposedDispatchResult(action) {
      if (action.type === ACTION_TYPES.READ_SLOT_WIDGETS) {
        return Promise.resolve(_effects.buildDisposedSlotWidgetsResult(action.payload));
      }
      return action.type === ACTION_TYPES.WAIT_UNTIL_READY ? Promise.resolve(false) : undefined;
    }

    function waitUntilReady() {
      if (isMountedAndReady()) { return Promise.resolve(true); }
      const runtime = ensureLaunchpadRuntime(_KDB);
      if (runtime.pendingPromises.waitUntilReady) { return runtime.pendingPromises.waitUntilReady; }
      const mountPromise = runtime.pendingPromises.mount;
      const readiness = mountPromise
        ? Promise.resolve(mountPromise).then(function (ok) { return ok === true && isMountedAndReady(); })
        : Promise.resolve(isMountedAndReady());
      runtime.pendingPromises.waitUntilReady = readiness.finally(function () {
        delete runtime.pendingPromises.waitUntilReady;
      });
      return runtime.pendingPromises.waitUntilReady;
    }

    // ---- destroy / state -----------------------------------------------------

    function destroy() {
      if (guard.isDisposed()) { return; }
      guard.dispose();
      try {
        _view.removeLaunchpadDom(_KDB);
        ensureLaunchpadRuntime(_KDB).pendingPromises = {};
        dispatchState({ type: ACTION_TYPES.DESTROY });
      } catch (err) {
        console.error("[launchpad.destroy] destroy boundary failed", err);
      }
    }

    function getState() {
      return guard.isDisposed() ? undefined : _selectors.readLaunchpadState(_KDB);
    }

    function dispatchState(action) {
      _KDB.state.launchpad = _state.reduceLaunchpadState(_KDB.state.launchpad, action);
    }

    function isMountedAndReady() {
      const domRefs = ensureLaunchpadRuntime(_KDB).domRefs;
      return _selectors.readLaunchpadReady(_KDB) === true
        && _view.isConnectedElement(domRefs.hideSpotEl)
        && _view.isConnectedElement(domRefs.rootEl)
        && hasPadSlots(_selectors.readLaunchpadState(_KDB));
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState };
  }

  function validateBuildResult(buildResult) {
    if (!buildResult || !buildResult.hideSpotEl) { throw new Error("Launchpad hide spot was not built."); }
    if (!Array.isArray(buildResult.tabs) || buildResult.tabs.length === 0) {
      throw new Error("Launchpad build produced no tab descriptors.");
    }
    if (!hasPadSlots(buildResult)) { throw new Error("Launchpad build produced no launchpad slots."); }
  }

  function hasPadSlots(source) {
    const padsByKey = source && source.padsByKey ? source.padsByKey : {};
    return Object.keys(padsByKey).some(function (padKey) {
      return Array.isArray(padsByKey[padKey]) && padsByKey[padKey].length > 0;
    });
  }

  function buildMountSucceededAction(buildResult) {
    return {
      type: ACTION_TYPES.MOUNT_SUCCEEDED,
      payload: {
        tabs: buildResult.tabs,
        padsByKey: buildResult.padsByKey,
        helperTabIds: buildResult.helperTabIds,
        helperTabPageId: buildResult.helperTabPageId
      }
    };
  }

  function buildMountFailedAction(err) {
    return {
      type: ACTION_TYPES.MOUNT_FAILED,
      payload: { errorCode: "LAUNCHPAD_MOUNT_FAILED", errorMessage: err && err.message ? err.message : String(err || "Unknown launchpad error.") }
    };
  }

  return registerLaunchpad;
});
