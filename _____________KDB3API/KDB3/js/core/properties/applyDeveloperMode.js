define([
  "./applyHideWidgetsToggleChange.js",
  "./effects/applyPersonalKdbHideDataHint.js"
], function (_applyHideWidgetsToggleChange, _applyPersonalKdbHideDataHint) {
  "use strict";

  var didWarnDisposed = false;

  function isPropertiesDisposed(_KDB) {
    var controller = _KDB && _KDB.runtime && _KDB.runtime.properties && _KDB.runtime.properties.controller;
    return !controller || controller._isDisposed === true;
  }

  function warnDisposedOnce() {
    if (didWarnDisposed) {
      return;
    }
    didWarnDisposed = true;
    console.warn("[properties.applyDeveloperMode] called after destroy");
  }

  function echoKdbControlCheckbox(_KDB, _value) {
    try {
      var dispatch = _KDB && _KDB.api && _KDB.api.kdbControl && _KDB.api.kdbControl.dispatch;
      if (typeof dispatch !== "function") {
        return;
      }
      dispatch({
        type: "kdbControl/settings/setDeveloperMode",
        payload: { value: !!_value, skipHistory: true }
      });
    } catch (err) {
      console.error("[properties.applyDeveloperMode]", err);
    }
  }

  function applyExplicit(_KDB, _options) {
    try {
      if (!_options || _options.enabled === undefined) {
        console.error("[properties.applyDeveloperMode] missing enabled");
      }
      var enabled = _options && _options.enabled === true;
      _KDB.properties = _KDB.properties || {};
      _KDB.properties.KDBHideWidgetsToggle = enabled === true;
      _applyHideWidgetsToggleChange.applyClass(_KDB, enabled === true);
    } catch (err) {
      console.error("[properties.applyDeveloperMode]", err);
    }
  }

  function applyDeveloperMode(_KDB, _options) {
    try {
      if (isPropertiesDisposed(_KDB)) {
        warnDisposedOnce();
        return;
      }

      var source = _options && _options.source;
      if (source === "boot" || source === "cognos") {
        _applyHideWidgetsToggleChange(_KDB);
        if (source === "cognos") {
          echoKdbControlCheckbox(_KDB, !!(_KDB.properties && _KDB.properties.KDBHideWidgetsToggle === true));
        }
        _applyPersonalKdbHideDataHint(_KDB);
        return;
      }

      if (source === "kdbControl" || source === "writebackRestore") {
        applyExplicit(_KDB, _options);
        _applyPersonalKdbHideDataHint(_KDB);
        return;
      }

      console.error("[properties.applyDeveloperMode] unknown source", source);
    } catch (err) {
      console.error("[properties.applyDeveloperMode]", err);
    }
  }

  return applyDeveloperMode;
});
