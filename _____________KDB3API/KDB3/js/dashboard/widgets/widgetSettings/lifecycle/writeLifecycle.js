define([], function () {
  function writeLifecycle(_KDB, _lifecycle, _error) {
    try {
      const state = _KDB.state.widgets.settings;
      state.lifecycle = _lifecycle;
      state.errorCode = _error ? "WIDGET_SETTINGS_LIFECYCLE_FAILED" : null;
      state.errorMessage = _error ? String(_error.message || _error) : null;
    } catch (err) {
      console.error("[widgetSettings.writeLifecycle] failed", err);
      throw err;
    }
  }
  return writeLifecycle;
});
