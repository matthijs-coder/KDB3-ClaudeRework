define([
  "../utils/kit/runtime.js",
  "./propertyDefinitions.js",
  "./loadProperties.js",
  "./hideDataHint.js"
], function (_kitRuntime, _definitions, _loadProperties, _applyPersonalKdbHideDataHint) {
  "use strict";

  var TOGGLE_ID = "KDBHideWidgetsToggle";

  function resolveContent(_KDB) {
    return _KDB &&
      _KDB.runtime &&
      _KDB.runtime.core &&
      _KDB.runtime.core.adapters &&
      _KDB.runtime.core.adapters.content || null;
  }

  function resolveDashboardClassHost(_KDB) {
    var selector = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root
      && _KDB.elements.selectors.root.dashboardClassHost;
    if (!selector || typeof document === "undefined" || !document.querySelector) {
      return null;
    }
    return document.querySelector(selector);
  }

  function applyDeveloperModeClass(_KDB, _isEnabled) {
    var hostEl = resolveDashboardClassHost(_KDB);
    if (!hostEl || !hostEl.classList) {
      console.error("[properties.applyDeveloperMode] dashboardClassHost node missing");
      return;
    }
    if (_isEnabled === true) {
      hostEl.classList.add(_definitions.DEVELOPER_MODE_CLASS);
      return;
    }
    hostEl.classList.remove(_definitions.DEVELOPER_MODE_CLASS);
  }

  function setHideWidgetsToggle(_KDB, _value) {
    _KDB.properties[TOGGLE_ID] = _value;
    applyDeveloperModeClass(_KDB, _value);
  }

  // Cognos is the source of truth: re-read the property and mirror it onto the class.
  function applyFromProperty(_KDB) {
    setHideWidgetsToggle(_KDB, _loadProperties.readToggleProperty(_KDB, TOGGLE_ID));
  }

  function applyExplicit(_KDB, _options) {
    if (!_options || _options.enabled === undefined) {
      console.error("[properties.applyDeveloperMode] missing enabled");
    }
    setHideWidgetsToggle(_KDB, !!_options && _options.enabled === true);
  }

  function echoKdbControlCheckbox(_KDB, _value) {
    var dispatch = _KDB && _KDB.api && _KDB.api.kdbControl && _KDB.api.kdbControl.dispatch;
    if (typeof dispatch !== "function") {
      return;
    }
    try {
      dispatch({
        type: "kdbControl/settings/setDeveloperMode",
        payload: { value: !!_value, skipHistory: true }
      });
    } catch (error) {
      console.error("[properties.applyDeveloperMode]", error);
    }
  }

  // Entry point behind `_KDB.api.properties.applyDeveloperMode` and the boot / Cognos change paths.
  function applyDeveloperMode(_KDB, _options) {
    var source = _options && _options.source;
    try {
      if (source === "boot" || source === "cognos") {
        applyFromProperty(_KDB);
        if (source === "cognos") {
          echoKdbControlCheckbox(_KDB, !!(_KDB.properties && _KDB.properties[TOGGLE_ID] === true));
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
    } catch (error) {
      console.error("[properties.applyDeveloperMode]", error);
    }
  }

  function subscribeHideWidgetsToggle(_KDB, _definition, _apply) {
    var subscriptions = _kitRuntime.ensureRuntime(_KDB, "properties").subscriptions;
    var content = resolveContent(_KDB);
    var handler;
    if (subscriptions[_definition.runtimeKey]) {
      return;
    }
    if (!content || typeof content.on !== "function" || typeof content.off !== "function") {
      console.error("[properties.subscribePropertyChanges] content adapter on/off unavailable");
      return;
    }
    handler = function () {
      return _apply({ source: "cognos" });
    };
    content.on(_definition.eventName, handler);
    subscriptions[_definition.runtimeKey] = content.off.bind(content, _definition.eventName, handler);
  }

  // `_apply` is the controller's guarded entry, so a Cognos toggle after destroy is ignored.
  function subscribePropertyChanges(_KDB, _apply) {
    _definitions.SUBSCRIPTIONS.forEach(function (definition) {
      if (definition.propertyId === TOGGLE_ID) {
        subscribeHideWidgetsToggle(_KDB, definition, _apply);
        return;
      }
      console.warn("[properties.subscribePropertyChanges] unknown subscription " + definition.propertyId);
    });
  }

  return {
    applyDeveloperMode: applyDeveloperMode,
    subscribePropertyChanges: subscribePropertyChanges
  };
});
