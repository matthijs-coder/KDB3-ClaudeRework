define([
  "../../../../core/utils/kit/runtime.js",
  "../actions/handleSeedDefaults.js",
  "../config/selectors.js",
  "../effects/startWidgetRenderLoading.js",
  "./optionMarking.js",
  "./panelBuild.js",
  "./panelEvents.js",
  "./panelOutsidePointerBehavior.js",
  "./resolveWidgetPlacementContext.js",
  "./toolbar.js"
], function (
  _kitRuntime,
  _handleSeedDefaults,
  _selectors,
  _startWidgetRenderLoading,
  _optionMarking,
  _panelBuild,
  _panelEvents,
  _panelOutsidePointerBehavior,
  _placementContext,
  _toolbar
) {
  function detachElement(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  function detachAllMatching(parentEl, selector) {
    Array.prototype.forEach.call(parentEl.querySelectorAll(selector), detachElement);
  }

  function placeWidgetSettingsPanel(_KDB, context) {
    const widgetEl = context.widgetEl;
    const existing = widgetEl.querySelector(_selectors.panelRootSelectorFor(String(context.widgetId || "")));
    if (existing) {
      return existing;
    }
    if (window.getComputedStyle(widgetEl).position === "static") {
      widgetEl.style.position = "relative";
    }
    const panel = _panelBuild.buildWidgetSettingsPanel(_KDB, context);
    _optionMarking.stampPanelVisType(_KDB, panel);
    const contentWrap = widgetEl.querySelector(_selectors.contentWrapperSelector);
    if (contentWrap && typeof contentWrap.insertAdjacentElement === "function") {
      contentWrap.insertAdjacentElement("afterbegin", panel);
    } else {
      widgetEl.appendChild(panel);
    }
    _startWidgetRenderLoading(_KDB, context);
    return panel;
  }

  function applyWidgetSettingsButtonVisibility(_KDB, payload) {
    const core = _KDB.runtime && _KDB.runtime.core && _KDB.runtime.core.domRefs;
    const root = core && core.renderParentEl ? core.renderParentEl : document;
    const dashboardSettings = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.settings && _KDB.state.kdbControl.settings.dashboard;
    const isHidden = payload && typeof payload.isHidden === "boolean"
      ? payload.isHidden === true
      : !!(dashboardSettings && dashboardSettings.areSettingsButtonsHidden === true);
    const buttonQuery = _selectors.widgetClass + " " + _selectors.toolbarSelector + ", " + _selectors.toolbarSelector;
    const buttons = root && root.querySelectorAll ? root.querySelectorAll(buttonQuery) : [];
    Array.prototype.forEach.call(buttons, function (button) {
      button.classList.toggle(_selectors.hideClass, isHidden);
    });
    return true;
  }

  function clearBoundAttributes(refs) {
    if (refs && refs.panel && typeof refs.panel.removeAttribute === "function") {
      refs.panel.removeAttribute(_selectors.settingsBoundAttr);
    }
    if (refs && refs.toolbar && typeof refs.toolbar.removeAttribute === "function") {
      refs.toolbar.removeAttribute(_selectors.toolbarBoundAttr);
    }
  }

  function abortWidgetController(runtime, controllerKey) {
    const controllers = runtime.abortControllers || {};
    const controller = controllers[controllerKey];
    if (controller && typeof controller.abort === "function") {
      controller.abort();
    }
    delete controllers[controllerKey];
  }

  function removeWidgetControlsDom(_KDB, runtime, widgetId, payload) {
    const refs = (runtime.domRefs || {})[widgetId];
    detachElement(refs && refs.panel);
    detachElement(refs && refs.toolbar);
    const widgetEl = _placementContext.resolveWidgetElForPayload(_KDB, widgetId, payload);
    if (widgetEl && typeof widgetEl.querySelectorAll === "function") {
      detachAllMatching(widgetEl, _selectors.panelRootSelectorFor(widgetId));
      detachAllMatching(widgetEl, _selectors.toolbarSelectorFor(widgetId));
    }
  }

  function cleanupWidgetControls(_KDB, payload) {
    const runtime = _KDB.runtime && _KDB.runtime.widgetSettings ? _KDB.runtime.widgetSettings : {};
    const widgetId = String(payload && (payload.widgetId || payload.id) || "");
    if (!widgetId) {
      return { ok: false, reasonCode: "WIDGET_SETTINGS_TARGET_MISSING" };
    }
    abortWidgetController(runtime, "panel:" + widgetId);
    abortWidgetController(runtime, "toolbar:" + widgetId);
    _kitRuntime.clearTimer(runtime.timers, "panelIcon:" + widgetId);
    _kitRuntime.clearTimer(runtime.timers, "panelFocusOut:" + widgetId);
    removeWidgetControlsDom(_KDB, runtime, widgetId, payload);
    const domRefs = runtime.domRefs || {};
    clearBoundAttributes(domRefs[widgetId]);
    delete domRefs[widgetId];
    delete (runtime.seedPlacementStarted || {})[widgetId];
    delete (runtime.pendingPromises || {})["seed:" + widgetId];
    _panelOutsidePointerBehavior.releaseDocumentPointerDownIfIdle(_KDB);
    return { ok: true, widgetId: widgetId };
  }

  function finishWidgetRenderLoading(_KDB, widgetId) {
    try {
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      const id = String(widgetId || "");
      if (id && loading && typeof loading.finishLoading === "function") {
        loading.finishLoading({ mountKey: "kdb-widget-render-loading-" + id });
      }
    } catch (err) {
      console.error("[widgetSettings.finishWidgetRenderLoading] failed", { widgetId: widgetId }, err);
    }
  }

  function onSeedDefaultsResolved(_KDB, widgetId, result) {
    if (result && result.ok === false) {
      finishWidgetRenderLoading(_KDB, widgetId);
    }
  }

  function onSeedDefaultsRejected(_KDB, widgetId, err) {
    console.error("[widgetSettings.startSeedDefaultsAfterPlacement] seed failed", { widgetId: widgetId }, err);
    finishWidgetRenderLoading(_KDB, widgetId);
  }

  function startSeedDefaultsAfterPlacement(_KDB, context) {
    try {
      const widgetId = String(context.widgetId || "");
      const runtime = _KDB.runtime && _KDB.runtime.widgetSettings;
      if (!widgetId || !runtime) {
        return;
      }
      runtime.seedPlacementStarted = runtime.seedPlacementStarted || {};
      if (runtime.seedPlacementStarted[widgetId] === true) {
        return;
      }
      runtime.seedPlacementStarted[widgetId] = true;
      const seedPayload = {
        widgetId: widgetId,
        widgetType: context.widgetType,
        kennzahlenTable: context.kennzahlenTable || null,
        source: "placement"
      };
      if (context.metricsTable) {
        seedPayload.metricsTable = context.metricsTable;
      }
      const seedResult = _handleSeedDefaults(_KDB, seedPayload);
      if (seedResult && typeof seedResult.then === "function") {
        seedResult.then(onSeedDefaultsResolved.bind(null, _KDB, widgetId), onSeedDefaultsRejected.bind(null, _KDB, widgetId));
      } else {
        onSeedDefaultsResolved(_KDB, widgetId, seedResult);
      }
    } catch (err) {
      console.error("[widgetSettings.startSeedDefaultsAfterPlacement] failed", { widgetId: context && context.widgetId }, err);
      finishWidgetRenderLoading(_KDB, context && context.widgetId);
    }
  }

  function runPlacementFailureCleanup(_KDB, payload) {
    try {
      const widgetId = String(payload && (payload.widgetId || payload.id) || "");
      if (widgetId) {
        cleanupWidgetControls(_KDB, { widgetId: widgetId, widgetEl: payload && (payload.widgetEl || payload.shellRoot) || null });
      }
    } catch (cleanupErr) {
      console.error("[widgetSettings.runPlacementFailureCleanup] failed", { widgetId: payload && payload.widgetId }, cleanupErr);
    }
  }

  function placeControls(_KDB, payload, widgetId, widgetEl, widgetType) {
    const context = {
      widgetId: widgetId,
      widgetEl: widgetEl,
      widgetType: widgetType,
      kennzahlenTable: _placementContext.resolveMetricsTableName(payload, widgetEl),
      metricsTable: _placementContext.readMetricsTableFromPayload(payload) || null,
      isHistoryReplay: payload.isHistoryReplay === true,
      source: payload.source || null
    };
    cleanupWidgetControls(_KDB, { widgetId: widgetId, widgetEl: widgetEl });
    const panel = placeWidgetSettingsPanel(_KDB, context);
    const toolbar = _toolbar.placeWidgetToolbar(_KDB, context);
    _KDB.runtime.widgetSettings.domRefs[widgetId] = { panel: panel, toolbar: toolbar };
    _toolbar.bindWidgetToolbar(_KDB, Object.assign({}, context, { toolbarEl: toolbar }));
    _panelEvents.bindWidgetSettingsPanel(_KDB, Object.assign({}, context, { panelEl: panel }));
    applyWidgetSettingsButtonVisibility(_KDB, {});
    if (payload.isHistoryReplay !== true && payload.source !== "historyReplay") {
      startSeedDefaultsAfterPlacement(_KDB, context);
    }
  }

  function placeAllWidgetControls(_KDB, payloadArg) {
    const payload = payloadArg || {};
    try {
      const widgetId = String(payload.widgetId || payload.id || "");
      const widgetEl = payload.widgetEl || payload.shellRoot || _placementContext.resolveWidgetEl(_KDB, widgetId);
      const typeResolution = _placementContext.resolveWidgetType(payload);
      if (!widgetEl || !widgetId) {
        return { ok: false, reasonCode: "WIDGET_SETTINGS_TARGET_MISSING" };
      }
      if (typeResolution.supported !== true) {
        return { ok: false, skipped: true, widgetId: widgetId, reasonCode: "WIDGET_SETTINGS_UNSUPPORTED_KIND" };
      }
      const shellValidation = _placementContext.validateShellRootClass(widgetEl, typeResolution.widgetType, widgetId);
      if (shellValidation) {
        return shellValidation;
      }
      placeControls(_KDB, payload, widgetId, widgetEl, typeResolution.widgetType);
      return { ok: true, widgetId: widgetId, widgetType: typeResolution.widgetType };
    } catch (err) {
      runPlacementFailureCleanup(_KDB, payloadArg);
      throw err;
    }
  }

  return {
    placeAllWidgetControls: placeAllWidgetControls,
    applyWidgetSettingsButtonVisibility: applyWidgetSettingsButtonVisibility,
    cleanupWidgetControls: cleanupWidgetControls
  };
});
