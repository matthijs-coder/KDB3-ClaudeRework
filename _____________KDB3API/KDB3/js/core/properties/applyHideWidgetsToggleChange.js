define([
  "./readPropertyValue.js",
  "./config/developerModeClass.js"
], function (_readPropertyValue, _developerModeClass) {
  "use strict";

  var DEVELOPER_MODE_CLASS = _developerModeClass.DEVELOPER_MODE_CLASS;

  function normalizeToggleValue(_value) {
    if (_value === true || _value === false) {
      return _value;
    }

    if (_value == null) {
      return false;
    }

    if (typeof _value === "string") {
      const normalized = _value.trim().toLowerCase();

      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }

      if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "") {
        return false;
      }
    }

    return !!_value;
  }

  function readDashboardClassHostSelector(_KDB) {
    return _KDB &&
      _KDB.elements &&
      _KDB.elements.selectors &&
      _KDB.elements.selectors.root &&
      _KDB.elements.selectors.root.dashboardClassHost || null;
  }

  function resolveDashboardClassHost(_KDB) {
    try {
      const selector = readDashboardClassHostSelector(_KDB);
      if (!selector || typeof document === "undefined" || !document.querySelector) {
        return null;
      }
      return document.querySelector(selector);
    } catch (error) {
      console.error("[properties.applyHideWidgetsToggleChange] dashboardClassHost resolve failed", error);
      return null;
    }
  }

  function applyDeveloperModeClass(_KDB, _isEnabled) {
    try {
      const hostEl = resolveDashboardClassHost(_KDB);
      if (!hostEl || !hostEl.classList) {
        console.error("[properties.applyHideWidgetsToggleChange] dashboardClassHost node missing");
        return;
      }
      if (_isEnabled === true) {
        hostEl.classList.add(DEVELOPER_MODE_CLASS);
        return;
      }
      hostEl.classList.remove(DEVELOPER_MODE_CLASS);
    } catch (error) {
      console.error("[properties.applyHideWidgetsToggleChange] class apply failed", error);
    }
  }

  function __controller(_KDB) {
    try {
      const rawValue = _readPropertyValue(_KDB, "KDBHideWidgetsToggle");
      const properties = _KDB.properties || {};
      const nextValue = normalizeToggleValue(rawValue);

      _KDB.properties = properties;
      properties.KDBHideWidgetsToggle = nextValue;
      applyDeveloperModeClass(_KDB, nextValue);
    } catch (error) {
      console.error("[properties.applyHideWidgetsToggleChange] failed", error);
    }
  }

  __controller.applyClass = applyDeveloperModeClass;

  return __controller;
});

