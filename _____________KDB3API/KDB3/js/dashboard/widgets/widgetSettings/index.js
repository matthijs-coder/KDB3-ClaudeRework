define([
  "./config/actionTypes.js",
  "./config.js",
  "./state.js",
  "./runtime.js",
  "./history.js",
  "./seed.js",
  "./colour.js",
  "./restore.js",
  "./view/placeAllWidgetControls.js",
  "./view/applyWidgetSettingsButtonVisibility.js",
  "./runtime/cleanupWidgetControls.js",
  "../../../core/utils/kit/data.js",
  "../../../core/utils/kit/errors.js",
  "../../../core/utils/kit/runtime.js"
], function (
  _actionTypes,
  _config,
  _state,
  _runtime,
  _history,
  _seed,
  _colour,
  _restore,
  _placeAllWidgetControls,
  _applyWidgetSettingsButtonVisibility,
  _cleanupWidgetControls,
  _kitData,
  _kitErrors,
  _kitRuntime
) {
  "use strict";

  // Lifecycle terms for widgetSettings: idle, ready, error, disposed.
  const DISPOSED_RESULT = { ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" };

  const ROUTES = {};
  ROUTES[_actionTypes.PLACE_CONTROLS] = _placeAllWidgetControls;
  ROUTES[_actionTypes.APPLY_BUTTON_VISIBILITY] = function (_KDB, payload) {
    return { ok: _applyWidgetSettingsButtonVisibility(_KDB, payload) === true };
  };
  ROUTES[_actionTypes.CLEANUP_WIDGET_CONTROLS] = _cleanupWidgetControls;
  ROUTES[_actionTypes.SEED_DEFAULTS] = _seed.handleSeedDefaults;
  ROUTES[_actionTypes.COMMIT_COLOUR] = _colour.handleCommitColour;
  ROUTES[_actionTypes.PARAMETER_SET_RESET] = _restore.handleParameterSetReset;
  ROUTES[_actionTypes.PARAMETER_SET_RESTORE_BATCH] = _restore.handleParameterSetRestoreBatch;
  ROUTES[_actionTypes.RESTORE_COMMITTED_SETTINGS] = _restore.restoreCommittedSettingsOnHistoryReplay;

  function registerWidgetSettings(_KDB) {
    ensureNamespaces(_KDB);
    _KDB.config.labels.de.widgetSettings = Object.assign({}, _config.LABELS, _KDB.config.labels.de.widgetSettings || {});
    ensureState(_KDB);
    const runtime = _runtime.ensureWidgetSettingsRuntime(_KDB);
    runtime.historyReplayHandlerContribution = _history.createWidgetSettingsHistoryReplayHandler(_KDB);
    const controller = createWidgetSettingsController(_KDB);
    _KDB.api.widgetSettings = controller;
    return controller;
  }

  function ensureNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
  }

  function ensureState(_KDB) {
    _KDB.state.widgets = _KDB.state.widgets || {};
    if (!_KDB.state.widgets.settings) {
      _KDB.state.widgets.settings = _state.createInitialState();
    }
  }

  function writeLifecycle(_KDB, lifecycle, error) {
    const state = _KDB.state.widgets.settings;
    state.lifecycle = lifecycle;
    state.errorCode = error ? "WIDGET_SETTINGS_LIFECYCLE_FAILED" : null;
    state.errorMessage = error ? String(error.message || error) : null;
  }

  function createWidgetSettingsController(_KDB) {
    const guard = _kitErrors.createDisposedGuard("widgetSettings");
    return {
      mount: function () {
        return mount(_KDB, guard);
      },
      destroy: function () {
        destroy(_KDB, guard);
      },
      dispatch: function (action) {
        return dispatch(_KDB, guard, action);
      },
      getState: function () {
        return getState(_KDB, guard);
      }
    };
  }

  function mount(_KDB, guard) {
    try {
      if (guard.blocked("mount")) {
        return false;
      }
      ensureState(_KDB);
      _runtime.ensureWidgetSettingsRuntime(_KDB);
      writeLifecycle(_KDB, "ready");
      return true;
    } catch (err) {
      console.error("[widgetSettings.mount] failed", err);
      writeLifecycle(_KDB, "error", err);
      return false;
    }
  }

  function destroy(_KDB, guard) {
    try {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      const runtime = _KDB.runtime && _KDB.runtime.widgetSettings;
      const errors = _kitRuntime.disposeRuntimeBuckets(runtime);
      if (errors.length) {
        console.error("[widgetSettings.destroy] runtime cleanup failed", errors);
      }
      if (runtime) {
        runtime.historyReplayHandlerContribution = null;
      }
      _KDB.runtime.widgetSettings = {};
      writeLifecycle(_KDB, "disposed");
    } catch (err) {
      console.error("[widgetSettings.destroy] failed", err);
    }
  }

  function dispatch(_KDB, guard, _action) {
    try {
      if (guard.blocked("dispatch")) {
        return Object.assign({}, DISPOSED_RESULT);
      }
      return routeAction(_KDB, _action || {});
    } catch (err) {
      console.error("[widgetSettings.dispatch] failed", err);
      writeLifecycle(_KDB, "error", err);
      return { ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_DISPATCH_FAILED" };
    }
  }

  function routeAction(_KDB, action) {
    const payload = normalizeActionPayload(action);
    if (Object.prototype.hasOwnProperty.call(ROUTES, action.type)) {
      return ROUTES[action.type](_KDB, payload);
    }
    return { ok: true, skipped: true, reasonCode: "WIDGET_SETTINGS_ACTION_UNKNOWN", actionType: action.type || null };
  }

  function normalizeActionPayload(action) {
    return action.payload
      ? Object.assign({}, action.payload, { widgetId: action.widgetId || action.payload.widgetId })
      : action;
  }

  function getState(_KDB, guard) {
    try {
      if (guard.isDisposed()) {
        return undefined;
      }
      return _kitData.cloneJson(_KDB.state.widgets.settings);
    } catch (err) {
      console.error("[widgetSettings.getState] failed", err);
      return undefined;
    }
  }

  return registerWidgetSettings;
});
