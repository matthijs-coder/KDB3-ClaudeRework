define(["./effects/applyPageSurfaceWhenReady.js"], function (_applyPageSurfaceWhenReady) {
  "use strict";

  const INTENT_AXIS = {
    "kdbControl.canvasIntent.dashboardWidth": "width",
    "kdbControl.canvasIntent.dashboardHeight": "height",
    "kdbControl.canvasIntent.dashboardBackgroundColor": "background"
  };

  function readRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.pageSurface = _KDB.runtime.pageSurface || {};
    return _KDB.runtime.pageSurface;
  }

  function guardDisposed(_instance, _flag, _message) {
    if (_instance._isDisposed !== true) return false;
    if (_instance[_flag] !== true) {
      _instance[_flag] = true;
      console.warn(_message);
    }
    return true;
  }

  function dispatch(_instance, _action) {
    try {
      if (guardDisposed(_instance, "didWarnDisposedDispatch", "[canvas.dispatch] called after destroy")) return;
      const axis = _action ? INTENT_AXIS[_action.type] : undefined;
      if (!axis) return;
      const value = _action.payload ? _action.payload.value : undefined;
      if (_instance.isMounted !== true || _applyPageSurfaceWhenReady.shouldQueue(_instance)) {
        _applyPageSurfaceWhenReady.writePending(_instance._KDB, axis, value);
        return;
      }
      _applyPageSurfaceWhenReady.applyAxis(_instance._KDB, axis, value);
    } catch (err) {
      console.error("[pageSurface.dispatch] failed", err);
    }
  }

  function mount(_instance) {
    try {
      if (guardDisposed(_instance, "didWarnDisposedMount", "[canvas.mount] called after destroy; obtain a fresh instance from the factory")) return;
      if (_instance.isMounted === true) return;
      _instance.isMounted = true;
      _applyPageSurfaceWhenReady.startApplyWhenReady(_instance);
    } catch (err) {
      console.error("[pageSurface.mount] failed", err);
    }
  }

  function destroy(_instance) {
    try {
      if (_instance._isDisposed === true) return;
      _instance._isDisposed = true;
      _applyPageSurfaceWhenReady.abortWait(_instance);
      const runtime = readRuntime(_instance._KDB);
      runtime.pending = {};
      runtime.canvasFacet = null;
    } catch (err) {
      console.error("[pageSurface.destroy] failed", err);
    }
  }

  function getState() {
    return undefined;
  }

  function createPageSurfaceController(_KDB) {
    try {
      const instance = {
        _KDB: _KDB,
        _isDisposed: false,
        isMounted: false,
        didFlushAfterReady: false,
        didWarnMissingWhenReady: false,
        didWarnDisposedDispatch: false,
        didWarnDisposedMount: false
      };
      return {
        mount: mount.bind(null, instance),
        destroy: destroy.bind(null, instance),
        dispatch: dispatch.bind(null, instance),
        getState: getState
      };
    } catch (err) {
      console.error("[pageSurface.createPageSurfaceController] failed", err);
      throw err;
    }
  }

  return createPageSurfaceController;
});
