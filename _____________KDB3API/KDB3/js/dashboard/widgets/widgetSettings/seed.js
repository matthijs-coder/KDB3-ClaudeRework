define([
  "./config.js",
  "./config/selectors.js",
  "../../../core/config/dropdownDefaults.js",
  "./runtime.js",
  "./state.js",
  "./seedApply.js",
  "./intent/descriptor.js",
  "./view/dropdownOptionSelection.js",
  "./view/resolveWidgetPlacementContext.js",
  "../../../core/config/colorPalette.js",
  "../../canvas/kdbControl/state/selectors.js"
], function (
  _config,
  _selectors,
  _dropdownDefaults,
  _runtime,
  _state,
  _seedApply,
  _descriptor,
  _dropdownOptionSelection,
  _placementContext,
  _colorPalette,
  _kdbControlSelectors
) {
  "use strict";

  const READINESS_TIMEOUT_MS = 3000;
  const VIS_STARTUP_KINDS = ["backgroundColor", "dimension", "visualization", "topN"];
  const TEXT_STARTUP_KINDS = ["backgroundColor", "fontSize", "layout"];
  const FAMILY_A_KEYS = ["showValues", "grouping", "iterator", "zoom", "valueCaption"];

  function handleSeedDefaults(_KDB, _payload) {
    try {
      const payload = _payload || {};
      const widgetId = String(payload.widgetId || payload.id || "");
      if (!widgetId) {
        return { ok: false, status: "error", reasonCode: "WIDGET_SETTINGS_SEED_TARGET_MISSING" };
      }
      const runtime = _runtime.ensureWidgetSettingsRuntime(_KDB);
      const pendingKey = "seed:" + widgetId;
      if (runtime.pendingPromises[pendingKey]) {
        return runtime.pendingPromises[pendingKey];
      }
      const promise = runSeedDefaults(_KDB, widgetId, payload).finally(function () {
        _state.clearSeedRuntime(_KDB, widgetId);
      });
      runtime.pendingPromises[pendingKey] = promise;
      return promise;
    } catch (err) {
      console.error("[widgetSettings.handleSeedDefaults] failed", { widgetId: _payload && _payload.widgetId }, err);
      return { ok: false, status: "error", reasonCode: "WIDGET_SETTINGS_SEED_ERROR", errorMessage: String(err.message || err) };
    }
  }

  async function runSeedDefaults(_KDB, widgetId, payload) {
    const widgetType = resolveSeedWidgetType(payload);
    const diagnostics = [];
    if (widgetType === "live") {
      const readiness = await waitForVisualContentReady(_KDB, widgetId);
      if (!readiness.ok) {
        _state.recordReadinessFailure(_KDB, widgetId, readiness);
        return { ok: false, widgetId: widgetId, status: "readiness_failed", errorCode: readiness.errorCode, diagnostics: diagnostics };
      }
    }
    clearLeftoverFamilyAKeys(_KDB, widgetId);
    const defaults = collectVisualStartupDefaults(_KDB, widgetId, widgetType);
    if (!defaults.length) {
      return { ok: false, widgetId: widgetId, status: "error", reasonCode: "WIDGET_SETTINGS_SEED_DEFAULTS_MISSING", diagnostics: diagnostics };
    }
    const split = splitStartupDefaults(defaults);
    const outcome = { hadFailure: false, hadDeferred: false };
    const singles = split.colourDefaults.concat(split.singleDefaultDescriptors);
    for (let index = 0; index < singles.length; index += 1) {
      recordOutcome(outcome, diagnostics, await _seedApply.applySingleStartupDefault(_KDB, singles[index]));
    }
    if (split.visBatchDescriptors.length > 0) {
      const batchResult = await _seedApply.applyVisStartupSeedBatch(_KDB, widgetId, widgetType, split.visBatchDescriptors);
      recordOutcome(outcome, diagnostics, batchResult);
    }
    if (outcome.hadFailure) {
      return { ok: false, widgetId: widgetId, status: outcome.hadDeferred ? "partial" : "error", diagnostics: diagnostics };
    }
    return { ok: true, widgetId: widgetId, status: outcome.hadDeferred ? "deferred" : "success", diagnostics: diagnostics };
  }

  function recordOutcome(outcome, diagnostics, result) {
    diagnostics.push(result);
    if (result.status === "deferred") {
      outcome.hadDeferred = true;
    } else if (!result.ok) {
      outcome.hadFailure = true;
    }
  }

  // The payload's widget type decides text vs. live; anything else seeds as live.
  function resolveSeedWidgetType(payload) {
    const kind = String(payload.widgetType || payload.kind || payload.type || "").toLowerCase();
    return kind === "text" ? "text" : "live";
  }

  function splitStartupDefaults(_defaults) {
    const split = { colourDefaults: [], singleDefaultDescriptors: [], visBatchDescriptors: [] };
    (_defaults || []).forEach(function (descriptor) {
      const kind = _config.normalizeKind(descriptor.kind);
      if (kind === "backgroundColor") {
        split.colourDefaults.push(descriptor);
      } else if (_config.isWidgetVisKind(kind)) {
        split.visBatchDescriptors.push(descriptor);
      } else {
        split.singleDefaultDescriptors.push(descriptor);
      }
    });
    return split;
  }

  function clearLeftoverFamilyAKeys(_KDB, _widgetId) {
    const settings = _KDB && _KDB.state && _KDB.state.widgets && _KDB.state.widgets.settings;
    const record = settings && settings.byWidget && settings.byWidget[String(_widgetId || "")];
    if (!record) {
      return;
    }
    FAMILY_A_KEYS.forEach(function (key) {
      delete record[key];
      delete record[key + "Meta"];
    });
  }

  async function waitForVisualContentReady(_KDB, _widgetId) {
    const widgetId = String(_widgetId || "");
    const api = _KDB && _KDB.api ? _KDB.api.widgetVis : null;
    if (!api || typeof api.dispatch !== "function") {
      return { ok: false, errorCode: "WIDGET_SETTINGS_WIDGET_VIS_API_MISSING" };
    }
    try {
      const result = await Promise.resolve(api.dispatch({
        type: "widgetVis/waitUntilContentReady",
        widgetId: widgetId,
        payload: { timeoutMs: READINESS_TIMEOUT_MS }
      }));
      if (result && result.ok === true) {
        return { ok: true };
      }
      return { ok: false, errorCode: result && result.errorCode ? result.errorCode : "WIDGET_SETTINGS_READINESS_FAILED" };
    } catch (err) {
      console.error("[widgetSettings.waitForVisualContentReady] failed", { widgetId: widgetId }, err);
      return { ok: false, errorCode: "WIDGET_SETTINGS_READINESS_DISPATCH_ERROR" };
    }
  }

  function collectVisualStartupDefaults(_KDB, _widgetId, _widgetType) {
    const widgetId = String(_widgetId || "");
    const widgetType = _widgetType === "text" ? "text" : "live";
    const startupKinds = widgetType === "text" ? TEXT_STARTUP_KINDS : VIS_STARTUP_KINDS;
    const panel = _placementContext.resolvePanel(_KDB, widgetId);
    const context = panel ? _descriptor.panelContext(panel) : { widgetId: widgetId, widgetType: widgetType };
    return startupKinds
      .map(function (kind) { return buildDefaultDescriptor(_KDB, context, panel, kind); })
      .filter(Boolean);
  }

  function buildDefaultDescriptor(_KDB, _context, _panel, _kind) {
    const kind = _config.normalizeKind(_kind);
    const option = _panel ? readDefaultOption(_panel, kind) : null;
    let descriptor;
    if (option) {
      descriptor = _descriptor.fromOption(_panel, option);
    } else {
      const fallback = _dropdownDefaults[kind] || _dropdownDefaults[_kind];
      if (!fallback) {
        return null;
      }
      descriptor = _descriptor.fromParts(_context, kind, fallback.key || "", fallback.useValue != null ? fallback.useValue : fallback.key || "");
    }
    if (!descriptor || kind !== "backgroundColor") {
      return descriptor;
    }
    try {
      return applyKdbControlColourDefault(_KDB, _context, kind, descriptor);
    } catch (err) {
      console.error("[widgetSettings.buildDefaultDescriptor] kdbControl colour read failed", err);
      return descriptor;
    }
  }

  function applyKdbControlColourDefault(_KDB, _context, kind, descriptor) {
    const control = _KDB && _KDB.api && _KDB.api.kdbControl;
    const snapshot = control && typeof control.getState === "function" ? control.getState() : undefined;
    const isText = _context && _context.widgetType === "text";
    const defaults = isText
      ? _kdbControlSelectors.readCommentDefaults(snapshot)
      : _kdbControlSelectors.readVisualizationDefaults(snapshot);
    const hex = String(defaults.backgroundColor || "").trim();
    if (!hex) {
      return descriptor;
    }
    const colorMap = (_KDB && _KDB.config && _KDB.config.options && _KDB.config.options.color)
      || (_colorPalette && _colorPalette.color)
      || {};
    const source = Object.keys(colorMap).map(function (key) {
      return { key: key, useValue: colorMap[key] };
    });
    const matched = _config.findMatchingOption(source, { useValue: hex });
    return _descriptor.fromParts(_context, kind, matched && matched.key ? matched.key : descriptor.optionKey, hex);
  }

  function readDefaultOption(_panel, _kind) {
    const dropdown = findDropdownByKind(_panel, _kind);
    if (!dropdown) {
      return null;
    }
    const selected = _dropdownOptionSelection.readSelectedOption(dropdown);
    if (selected) {
      return selected;
    }
    const markedDefault = dropdown.querySelector(_selectors.byAttr(_selectors.defaultOptionAttr, "1"));
    if (markedDefault) {
      return markedDefault;
    }
    return dropdown.querySelector(_selectors.dropdownOptionSelector);
  }

  function findDropdownByKind(_panel, _kind) {
    const kind = String(_kind || "");
    if (!_panel || !kind || typeof _panel.querySelector !== "function") {
      return null;
    }
    const dropdowns = _panel.querySelectorAll(_selectors.dropdownSelector);
    for (let index = 0; index < dropdowns.length; index += 1) {
      const dropdownKind = _config.normalizeKind(dropdowns[index].getAttribute(_selectors.dropdownKindAttr) || "");
      if (dropdownKind === kind) {
        return dropdowns[index];
      }
    }
    const optionRow = _panel.querySelector(_selectors.dropdownOptionSelector + _selectors.byAttr(_selectors.dropdownKindAttr, kind));
    if (optionRow && typeof optionRow.closest === "function") {
      return optionRow.closest(_selectors.dropdownSelector);
    }
    return null;
  }

  return {
    handleSeedDefaults: handleSeedDefaults,
    waitForVisualContentReady: waitForVisualContentReady
  };
});
