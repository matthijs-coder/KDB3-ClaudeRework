define([
  "./loadObjectProperties.js",
  "./loadToggleProperties.js",
  "./applyDeveloperMode.js",
  "./subscribePropertyChanges.js",
  "./runtime/ensurePropertiesRuntime.js",
  "./runtime/clearPropertiesRuntime.js",
  "./config/developerModeLabels.js"
], function (
  _loadObjectProperties,
  _loadToggleProperties,
  _applyDeveloperMode,
  _subscribePropertyChanges,
  _ensurePropertiesRuntime,
  _clearPropertiesRuntime,
  _developerModeLabels
) {
  "use strict";

  function createController(_KDB) {
    return {
      _KDB: _KDB,
      _isDisposed: false,
      _didWarnLoadAfterDestroy: false,
      _didWarnSubscribeAfterDestroy: false,
      loadProperties: loadProperties,
      subscribePropertyChanges: subscribePropertyChanges,
      destroy: destroy
    };
  }

  function warnLoadAfterDestroy(controller) {
    if (!controller._didWarnLoadAfterDestroy) {
      controller._didWarnLoadAfterDestroy = true;
      console.warn("[properties.loadProperties] called after destroy");
    }
  }

  function warnSubscribeAfterDestroy(controller) {
    if (!controller._didWarnSubscribeAfterDestroy) {
      controller._didWarnSubscribeAfterDestroy = true;
      console.warn("[properties.subscribePropertyChanges] called after destroy");
    }
  }

  function loadProperties() {
    if (this._isDisposed) {
      warnLoadAfterDestroy(this);
      return undefined;
    }

    try {
      this._KDB.properties = {};
      _loadObjectProperties(this._KDB);
      _loadToggleProperties(this._KDB);
      _applyDeveloperMode(this._KDB, { source: "boot" });
      return this._KDB.properties;
    } catch (error) {
      console.error("[properties.loadProperties] failed", error);
      throw error;
    }
  }

  function subscribePropertyChanges() {
    if (this._isDisposed) {
      warnSubscribeAfterDestroy(this);
      return;
    }

    try {
      _ensurePropertiesRuntime(this._KDB);
      _subscribePropertyChanges(this._KDB);
    } catch (error) {
      console.error("[properties.subscribePropertyChanges] failed", error);
    }
  }

  function destroy() {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;

    try {
      _clearPropertiesRuntime(this._KDB);
      delete this._KDB.runtime.properties.controller;
    } catch (error) {
      console.error("[properties.destroy] failed", error);
    }
  }

  function registerPropertiesApi(_KDB) {
    _KDB.api = _KDB.api || {};
    _KDB.api.properties = {
      applyDeveloperMode: function (_options) {
        return _applyDeveloperMode(_KDB, _options);
      }
    };
  }

  function __orchestrator(_KDB) {
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    var existing = _KDB.config.labels.de.developerMode && typeof _KDB.config.labels.de.developerMode === "object" ? _KDB.config.labels.de.developerMode : {};
    _KDB.config.labels.de.developerMode = Object.assign({}, _developerModeLabels, existing);
    const runtimeProperties = _ensurePropertiesRuntime(_KDB);
    const propertiesController = createController(_KDB);
    runtimeProperties.controller = propertiesController;
    registerPropertiesApi(_KDB);
    propertiesController.loadProperties();
    propertiesController.subscribePropertyChanges();
    return propertiesController;
  }

  return __orchestrator;
});
