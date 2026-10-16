define([], function () {
  "use strict";

  function dispatchModuleReplay(_KDB, moduleKey, action) {
    const api = _KDB && _KDB.api ? _KDB.api[moduleKey] : null;
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve(false);
    }
    return Promise.resolve(api.dispatch(action)).then(function (result) {
      return result && result.ok === true;
    });
  }

  function dispatchWidgetBaseReplay(_KDB, action) {
    return dispatchModuleReplay(_KDB, "widgetBase", action);
  }

  function dispatchWidgetSettingsReplay(_KDB, action) {
    return dispatchModuleReplay(_KDB, "widgetSettings", action);
  }

  return {
    dispatchWidgetBaseReplay: dispatchWidgetBaseReplay,
    dispatchWidgetSettingsReplay: dispatchWidgetSettingsReplay
  };
});
