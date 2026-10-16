define([
  "./state/actionTypes.js",
  "./state/initialState.js",
  "./state/reducer.js",
  "./actions.js",
  "./effects.js",
  "./history.js",
  "./settingsForm.js",
  "./framework/index.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js"
], function (_types, _initialState, _reduceKdbControl, _actions, _effects, _history, _bindSettingsForm, _mountFramework, _rt, _errors) {
  "use strict";
  // Lifecycle terms: idle, mounted, error, disposed (state.kdbControl.lifecycle).

  function createKdbControlController(_KDB) {
    var guard = _errors.createDisposedGuard("kdbControl");
    var runner = _actions.createActionRunner(_KDB);

    function recordError(errorCode, err) {
      _KDB.state.kdbControl = _reduceKdbControl(_KDB.state.kdbControl || _initialState(), {
        type: _types.ACTION_ERROR,
        payload: { errorCode: errorCode, errorMessage: String(err) }
      });
    }

    function getState() {
      return _KDB.state.kdbControl;
    }

    function dispatch(action) {
      if (guard.blocked("dispatch")) return { ok: false, errorCode: "KDB_CONTROL_DISPOSED" };
      try {
        return runner.dispatchAction(action);
      } catch (err) {
        console.error("[kdbControl.dispatch] " + (action && action.type) + " failed", err);
        return { ok: false, errorCode: "KDB_CONTROL_DISPATCH_FAILED" };
      }
    }

    function syncView() {
      _effects.syncFrameworkView(_KDB);
    }

    function mount() {
      if (guard.blocked("mount")) return;
      try {
        var rt = _rt.ensureRuntime(_KDB, "kdbControl", { warnedMissingApis: {} });
        rt.historyReplayHandlerContribution = _history.createSettingsReplayHandler(runner.applySettingsAction);
        _KDB.state.kdbControl = _reduceKdbControl(_initialState(), { type: _types.ACTION_INIT });
        var seeded = _KDB.properties && _KDB.properties.KDBHideWidgetsToggle === true;
        dispatch({ type: _types.ACTION_SETTINGS_SET_DEVELOPER_MODE, payload: { value: seeded, skipHistory: true } });
        var surface = { dispatch: dispatch, getState: getState };
        _mountFramework(_KDB, surface);
        _bindSettingsForm(_KDB, surface);
        _effects.applyInitialEffects(_KDB);
        _effects.subscribeAuthoringMode(_KDB);
      } catch (err) {
        console.error("[kdbControl.mount] failed", err);
        recordError("mount", err);
      }
    }

    function destroy() {
      if (guard.isDisposed()) return;
      guard.dispose();
      try {
        var rt = _KDB.runtime && _KDB.runtime.kdbControl;
        if (rt) {
          if (rt.domRefs.placedShell && rt.domRefs.placedShell.parentNode) rt.domRefs.placedShell.parentNode.removeChild(rt.domRefs.placedShell);
          var errors = _rt.disposeRuntimeBuckets(rt);
          if (errors.length) console.error("[kdbControl.destroy] cleanup errors", errors);
          rt.frameworkBindContext = null;
          rt.historyReplayHandlerContribution = null;
          rt.parameterSetRunId = undefined;
          rt.warnedMissingApis = {};
        }
        _KDB.state.kdbControl = _reduceKdbControl(_KDB.state.kdbControl, { type: _types.ACTION_DESTROY });
      } catch (err) {
        console.error("[kdbControl.destroy] failed", err);
        recordError("destroy", err);
      }
    }

    return { mount: mount, destroy: destroy, dispatch: dispatch, getState: getState, syncView: syncView };
  }

  function registerKdbControl(_KDB) {
    _KDB.api.kdbControl = createKdbControlController(_KDB);
  }

  return registerKdbControl;
});
