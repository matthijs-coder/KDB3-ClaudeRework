define([
  "../utils/kit/errors.js",
  "../utils/kit/runtime.js",
  "./propertyDefinitions.js",
  "./loadProperties.js",
  "./developerMode.js"
], function (_kitErrors, _kitRuntime, _definitions, _loadProperties, _developerMode) {
  "use strict";

  function mergeDeveloperModeLabels(_KDB) {
    _KDB.config = _KDB.config || {};
    var existing = _KDB.config.labels.de.developerMode && typeof _KDB.config.labels.de.developerMode === "object"
      ? _KDB.config.labels.de.developerMode
      : {};
    _KDB.config.labels.de.developerMode = Object.assign({}, _definitions.DEVELOPER_MODE_LABELS, existing);
  }

  function createController(_KDB, _runtime) {
    const guard = _kitErrors.createDisposedGuard("properties");

    function loadProperties() {
      if (guard.blocked("loadProperties")) {
        return undefined;
      }
      const properties = _loadProperties.loadProperties(_KDB);
      _developerMode.applyDeveloperMode(_KDB, { source: "boot" });
      return properties;
    }

    function subscribePropertyChanges() {
      if (guard.blocked("subscribePropertyChanges")) {
        return;
      }
      try {
        _developerMode.subscribePropertyChanges(_KDB, applyDeveloperMode);
      } catch (error) {
        console.error("[properties.subscribePropertyChanges] failed", error);
      }
    }

    function applyDeveloperMode(_options) {
      if (guard.blocked("applyDeveloperMode")) {
        return undefined;
      }
      return _developerMode.applyDeveloperMode(_KDB, _options);
    }

    // The developer-mode class and the hint badge stay in the DOM: a second boot may already own them.
    function destroy() {
      if (guard.isDisposed()) {
        return;
      }
      guard.dispose();
      _kitRuntime.disposeRuntimeBuckets(_runtime).forEach(function (error) {
        console.error("[properties.destroy] failed", error);
      });
      delete _runtime.controller;
    }

    return {
      loadProperties: loadProperties,
      subscribePropertyChanges: subscribePropertyChanges,
      applyDeveloperMode: applyDeveloperMode,
      destroy: destroy
    };
  }

  function registerProperties(_KDB) {
    mergeDeveloperModeLabels(_KDB);
    const runtime = _kitRuntime.ensureRuntime(_KDB, "properties", { hintSeq: 0 });
    const controller = createController(_KDB, runtime);
    runtime.controller = controller;
    _KDB.api = _KDB.api || {};
    _KDB.api.properties = { applyDeveloperMode: controller.applyDeveloperMode };
    controller.loadProperties();
    controller.subscribePropertyChanges();
    return controller;
  }

  return registerProperties;
});
