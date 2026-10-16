define([
  "../runtime/initializeRuntime.js",
  "../effects/collectVisualStartupDefaults.js",
  "../effects/waitForVisualContentReady.js",
  "../state/recordWidgetSettingSeedStatus.js",
  "./applyVisStartupSeedBatch.js",
  "./applySingleStartupDefault.js",
  "./prepareStartupDefaultsForSeed.js"
], function (
  _initializeRuntime,
  _collectVisualStartupDefaults,
  _waitForVisualContentReady,
  _recordSeedStatus,
  _applyVisStartupSeedBatch,
  _applySingleStartupDefault,
  _prepareStartupDefaultsForSeed
) {
  "use strict";

  function handleSeedDefaults(_KDB, _payload) {
    try {
      const payload = _payload || {};
      const widgetId = String(payload.widgetId || payload.id || "");
      if (!widgetId) {
        return { ok: false, status: "error", reasonCode: "WIDGET_SETTINGS_SEED_TARGET_MISSING" };
      }
      const runtime = _initializeRuntime(_KDB);
      const pendingKey = "seed:" + widgetId;
      if (runtime.pendingPromises[pendingKey]) {
        return runtime.pendingPromises[pendingKey];
      }
      const promise = runSeedDefaults(_KDB, widgetId, payload).finally(function () {
        _recordSeedStatus.clearSeedRuntime(_KDB, widgetId);
      });
      runtime.pendingPromises[pendingKey] = promise;
      return promise;
    } catch (err) {
      console.error("[widgetSettings.handleSeedDefaults] failed", { widgetId: _payload && _payload.widgetId }, err);
      return { ok: false, status: "error", reasonCode: "WIDGET_SETTINGS_SEED_ERROR", errorMessage: String(err.message || err) };
    }
  }

  async function runSeedDefaults(_KDB, _widgetId, _payload) {
    const widgetId = String(_widgetId || "");
    const payload = _payload || {};
    const widgetType = _prepareStartupDefaultsForSeed.resolveSeedWidgetType(payload);
    const diagnostics = [];
    if (widgetType !== "live" && widgetType !== "text") {
      return {
        ok: true,
        widgetId: widgetId,
        status: "skipped",
        skipped: true,
        reasonCode: "WIDGET_SETTINGS_SEED_NON_VISUAL",
        diagnostics: diagnostics
      };
    }
    if (widgetType === "live") {
      const readiness = await _waitForVisualContentReady(_KDB, widgetId);
      if (!readiness.ok) {
        _recordSeedStatus.recordReadinessFailure(_KDB, widgetId, readiness);
        return {
          ok: false,
          widgetId: widgetId,
          status: "readiness_failed",
          errorCode: readiness.errorCode,
          diagnostics: diagnostics
        };
      }
    }
    _prepareStartupDefaultsForSeed.clearLeftoverFamilyAKeys(_KDB, widgetId);
    const defaults = _collectVisualStartupDefaults(_KDB, widgetId, widgetType);
    if (!defaults.length) {
      return {
        ok: false,
        widgetId: widgetId,
        status: "error",
        reasonCode: "WIDGET_SETTINGS_SEED_DEFAULTS_MISSING",
        diagnostics: diagnostics
      };
    }
    const split = _prepareStartupDefaultsForSeed.splitStartupDefaults(defaults);
    let hadFailure = false;
    let hadDeferred = false;
    let index = 0;
    while (index < split.colourDefaults.length) {
      const descriptor = split.colourDefaults[index];
      const controlResult = await _applySingleStartupDefault(_KDB, descriptor);
      diagnostics.push(controlResult);
      if (controlResult.status === "deferred") {
        hadDeferred = true;
      } else if (!controlResult.ok) {
        hadFailure = true;
      }
      index += 1;
    }
    index = 0;
    while (index < split.singleDefaultDescriptors.length) {
      const descriptor = split.singleDefaultDescriptors[index];
      const controlResult = await _applySingleStartupDefault(_KDB, descriptor);
      diagnostics.push(controlResult);
      if (controlResult.status === "deferred") {
        hadDeferred = true;
      } else if (!controlResult.ok) {
        hadFailure = true;
      }
      index += 1;
    }
    if (split.visBatchDescriptors.length > 0) {
      const batchResult = await _applyVisStartupSeedBatch(
        _KDB,
        widgetId,
        widgetType,
        split.visBatchDescriptors
      );
      diagnostics.push(batchResult);
      if (batchResult.status === "deferred") {
        hadDeferred = true;
      } else if (!batchResult.ok) {
        hadFailure = true;
      }
    }
    if (hadFailure) {
      return {
        ok: false,
        widgetId: widgetId,
        status: hadDeferred ? "partial" : "error",
        diagnostics: diagnostics
      };
    }
    return {
      ok: true,
      widgetId: widgetId,
      status: hadDeferred ? "deferred" : "success",
      diagnostics: diagnostics
    };
  }

  return handleSeedDefaults;
});
