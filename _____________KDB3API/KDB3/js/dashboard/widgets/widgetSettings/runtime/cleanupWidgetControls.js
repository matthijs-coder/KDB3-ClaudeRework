define([
  "../config/selectors.js",
  "../view/resolveWidgetPlacementContext.js",
  "./detachWidgetControlElements.js"
], function (_selectors, _placementContext, _detachElements) {
  function __controller(_KDB, _payload) {
    try {
      const runtime = _KDB.runtime && _KDB.runtime.widgetSettings ? _KDB.runtime.widgetSettings : {};
      const widgetId = String(_payload && (_payload.widgetId || _payload.id) || "");
      if (!widgetId) {
        return { ok: false, reasonCode: "WIDGET_SETTINGS_TARGET_MISSING" };
      }
      abortController(runtime, "panel:" + widgetId);
      abortController(runtime, "toolbar:" + widgetId);
      clearWidgetPanelTimers(runtime, widgetId);
      removeWidgetControlsDom(_KDB, runtime, widgetId, _payload);
      clearDomRefs(runtime, widgetId);
      clearSeedPlacementRuntime(runtime, widgetId);
      return { ok: true, widgetId: widgetId };
    } catch (err) {
      console.error("[widgetSettings.cleanupWidgetControls] failed", { widgetId: _payload && _payload.widgetId }, err);
      throw err;
    }
  }

  function clearWidgetPanelTimers(runtime, widgetId) {
    try {
      const timers = runtime.timers || {};
      clearTimerKey(timers, "panelIcon:" + widgetId);
      clearTimerKey(timers, "panelFocusOut:" + widgetId);
    } catch (err) {
      console.error("[widgetSettings.clearWidgetPanelTimers] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  function clearTimerKey(timers, key) {
    try {
      const timerId = timers[key];
      if (timerId != null) {
        clearTimeout(timerId);
      }
      delete timers[key];
    } catch (err) {
      console.error("[widgetSettings.clearWidgetSettingsTimer] failed", { key: key }, err);
      throw err;
    }
  }

  function abortController(runtime, controllerKey) {
    try {
      const controllers = runtime.abortControllers || {};
      const controller = controllers[controllerKey];
      if (controller && typeof controller.abort === "function") {
        controller.abort();
      }
      delete controllers[controllerKey];
    } catch (err) {
      console.error("[widgetSettings.abortWidgetControlController] failed", { controllerKey: controllerKey }, err);
      throw err;
    }
  }

  function clearSeedPlacementRuntime(runtime, widgetId) {
    try {
      const started = runtime.seedPlacementStarted || {};
      delete started[widgetId];
      const pending = runtime.pendingPromises || {};
      delete pending["seed:" + widgetId];
    } catch (err) {
      console.error("[widgetSettings.clearSeedPlacementRuntime] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  function clearDomRefs(runtime, widgetId) {
    try {
      const domRefs = runtime.domRefs || {};
      clearBoundAttributes(domRefs[widgetId]);
      delete domRefs[widgetId];
    } catch (err) {
      console.error("[widgetSettings.clearWidgetControlDomRefs] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  function removeWidgetControlsDom(_KDB, runtime, widgetId, payload) {
    try {
      const domRefs = runtime.domRefs || {};
      const refs = domRefs[widgetId];
      _detachElements.detachControlElement(refs && refs.panel);
      _detachElements.detachControlElement(refs && refs.toolbar);
      const widgetEl = _placementContext.resolveWidgetElForPayload(_KDB, widgetId, payload);
      if (widgetEl && typeof widgetEl.querySelectorAll === "function") {
        _detachElements.detachAllMatching(widgetEl, _selectors.panelRootSelectorFor(widgetId));
        _detachElements.detachAllMatching(widgetEl, _selectors.toolbarSelectorFor(widgetId));
      }
    } catch (err) {
      console.error("[widgetSettings.removeWidgetControlsDom] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  function clearBoundAttributes(refs) {
    try {
      if (refs && refs.panel && typeof refs.panel.removeAttribute === "function") {
        refs.panel.removeAttribute(_selectors.settingsBoundAttr);
      }
      if (refs && refs.toolbar && typeof refs.toolbar.removeAttribute === "function") {
        refs.toolbar.removeAttribute(_selectors.toolbarBoundAttr);
      }
    } catch (err) {
      console.error("[widgetSettings.clearWidgetControlBoundAttributes] failed", err);
      throw err;
    }
  }

  return __controller;
});
