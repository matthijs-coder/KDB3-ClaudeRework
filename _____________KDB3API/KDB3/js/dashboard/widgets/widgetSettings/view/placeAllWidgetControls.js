define([
  "../runtime/cleanupWidgetControls.js",
  "../actions/handleSeedDefaults.js",
  "./placeWidgetSettingsPanel.js",
  "./placeWidgetToolbar.js",
  "./bindWidgetSettingsPanel.js",
  "./bindWidgetToolbar.js",
  "./applyWidgetSettingsButtonVisibility.js",
  "./resolveWidgetPlacementContext.js"
], function (_cleanupWidgetControls, _handleSeedDefaults, _placeWidgetSettingsPanel, _placeWidgetToolbar, _bindWidgetSettingsPanel, _bindWidgetToolbar, _applyWidgetSettingsButtonVisibility, _placementContext) {
  function __controller(_KDB, _payload) {
    try {
      const payload = _payload || {};
      const widgetId = String(payload.widgetId || payload.id || "");
      const widgetEl = payload.widgetEl || payload.shellRoot || _placementContext.resolveWidgetEl(_KDB, widgetId);
      const typeResolution = _placementContext.resolveWidgetType(payload);
      let context;
      let panel;
      let toolbar;
      let shellValidation;
      if (!widgetEl || !widgetId) {
        return { ok: false, reasonCode: "WIDGET_SETTINGS_TARGET_MISSING" };
      }
      if (typeResolution.supported !== true) {
        return { ok: false, skipped: true, widgetId: widgetId, reasonCode: "WIDGET_SETTINGS_UNSUPPORTED_KIND" };
      }
      shellValidation = _placementContext.validateShellRootClass(widgetEl, typeResolution.widgetType, widgetId);
      if (shellValidation) {
        return shellValidation;
      }
      context = {
        widgetId: widgetId,
        widgetEl: widgetEl,
        widgetType: typeResolution.widgetType,
        kennzahlenTable: _placementContext.resolveMetricsTableName(payload, widgetEl),
        metricsTable: _placementContext.readMetricsTableFromPayload(payload) || null,
        isHistoryReplay: payload.isHistoryReplay === true,
        source: payload.source || null
      };
      _cleanupWidgetControls(_KDB, { widgetId: widgetId, widgetEl: widgetEl });
      panel = _placeWidgetSettingsPanel(_KDB, context);
      toolbar = _placeWidgetToolbar(_KDB, context);
      rememberDomRefs(_KDB, widgetId, panel, toolbar);
      _bindWidgetToolbar(_KDB, Object.assign({}, context, { toolbarEl: toolbar }));
      _bindWidgetSettingsPanel(_KDB, Object.assign({}, context, { panelEl: panel }));
      _applyWidgetSettingsButtonVisibility(_KDB, {});
      if (payload.isHistoryReplay !== true && payload.source !== "historyReplay") {
        startSeedDefaultsAfterPlacement(_KDB, context);
      }
      return { ok: true, widgetId: widgetId, widgetType: typeResolution.widgetType };
    } catch (err) {
      runPlacementFailureCleanup(_KDB, _payload);
      console.error("[widgetSettings.placeAllWidgetControls] failed", { widgetId: _payload && _payload.widgetId }, err);
      throw err;
    }
  }

  function startSeedDefaultsAfterPlacement(_KDB, _context) {
    try {
      const context = _context || {};
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
      console.error("[widgetSettings.startSeedDefaultsAfterPlacement] failed", { widgetId: _context && _context.widgetId }, err);
      finishWidgetRenderLoading(_KDB, _context && _context.widgetId);
    }
  }

  function runPlacementFailureCleanup(_KDB, payload) {
    try {
      const widgetId = String(payload && (payload.widgetId || payload.id) || "");
      if (!widgetId) {
        return;
      }
      _cleanupWidgetControls(_KDB, {
        widgetId: widgetId,
        widgetEl: payload && (payload.widgetEl || payload.shellRoot) || null
      });
    } catch (cleanupErr) {
      console.error("[widgetSettings.runPlacementFailureCleanup] failed", { widgetId: payload && payload.widgetId }, cleanupErr);
    }
  }

  function rememberDomRefs(_KDB, widgetId, panel, toolbar) {
    try {
      _KDB.runtime.widgetSettings.domRefs[widgetId] = {
        panel: panel,
        toolbar: toolbar
      };
    } catch (err) {
      console.error("[widgetSettings.rememberDomRefs] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  function finishWidgetRenderLoading(_KDB, widgetId) {
    try {
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      const id = String(widgetId || "");
      if (!id || !loading || typeof loading.finishLoading !== "function") {
        return;
      }
      loading.finishLoading({ mountKey: "kdb-widget-render-loading-" + id });
    } catch (err) {
      console.error("[widgetSettings.finishWidgetRenderLoading] failed", { widgetId: widgetId }, err);
    }
  }

  function onSeedDefaultsRejected(_KDB, widgetId, err) {
    console.error("[widgetSettings.startSeedDefaultsAfterPlacement] seed failed", { widgetId: widgetId }, err);
    finishWidgetRenderLoading(_KDB, widgetId);
  }

  function onSeedDefaultsResolved(_KDB, widgetId, result) {
    if (result && result.ok === false) {
      finishWidgetRenderLoading(_KDB, widgetId);
    }
  }

  return __controller;
});
