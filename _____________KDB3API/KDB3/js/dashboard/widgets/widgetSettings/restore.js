define([
  "../../../core/config/dropdownDefaults.js",
  "./runtime.js",
  "./state.js",
  "./seed.js",
  "./colour.js",
  "./intent/visSnapshot.js",
  "./effects/dispatchWidgetSettingsIntent.js",
  "./view/controls.js",
  "./view/optionMarking.js",
  "./view/resolveWidgetPlacementContext.js",
  "../widgetVis/selectors.js",
  "../../../core/config/visualizations/visTypeRules.js"
], function (
  _dropdownDefaults,
  _runtime,
  _state,
  _seed,
  _colour,
  _visSnapshot,
  _dispatchIntent,
  _controls,
  _optionMarking,
  _placementContext,
  _visSelectors,
  _visTypeRules
) {
  "use strict";

  const RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";
  const CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  const FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  const VIS_KEYS = { tab: 1, x: 1, y: 1, w: 1, h: 1, kind: 1, code: 1, type: 1, dim: 1, topn: 1, vals: 1, grp: 1, iter: 1, wzbar: 1, vcap: 1, bgcol: 1, ctcol: 1 };
  const TXT_KEYS = { tab: 1, x: 1, y: 1, w: 1, h: 1, kind: 1, text: 1, fsize: 1, bgcol: 1, style: 1 };
  const VIS_DEFAULTS = {
    visualization: _dropdownDefaults.visualization.useValue,
    dimension: _dropdownDefaults.dimension.useValue,
    topN: _dropdownDefaults.topN.useValue
  };
  const TXT_DEFAULTS = {
    fontSize: _dropdownDefaults.fontSize.useValue,
    layout: _dropdownDefaults.layout.useValue,
    backgroundColor: _dropdownDefaults.backgroundColor.useValue
  };
  const VIS_FLAG_FIELDS = [["vals", "showValues"], ["iter", "iterator"], ["wzbar", "zoom"], ["vcap", "valueCaption"]];

  function hasField(entry, field) {
    return Object.prototype.hasOwnProperty.call(entry || {}, field);
  }

  // A stale runId (lower than the active one) is cancelled; the active runId is then taken over.
  function claimParameterSetRun(runtime, runId) {
    if (typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId) {
      return false;
    }
    runtime.parameterSetRunId = runId;
    return true;
  }

  // widgetSettings/parameterSetResetRequested (contracts/widgetBase-parameterSetReset-contractdelta.md):
  // drop committed settings records and detach the settings controls of the requested widgets.
  // History is never written on this path.
  function handleParameterSetReset(_KDB, _payload) {
    const payload = _payload || {};
    const diagnostics = [];
    if (typeof payload.runId !== "number") {
      diagnostics.push({ code: RESET_FAILED, message: "widgetSettings/parameterSetResetRequested requires a numeric runId" });
      return { ok: false, status: "error", diagnostics: diagnostics };
    }
    const runtime = _runtime.ensureWidgetSettingsRuntime(_KDB);
    if (!claimParameterSetRun(runtime, payload.runId)) {
      diagnostics.push({ code: CANCELLED, message: "stale parameterSet runId " + payload.runId + " superseded by " + runtime.parameterSetRunId });
      return { ok: false, status: "cancelled", diagnostics: diagnostics };
    }
    const widgetIds = Array.isArray(payload.widgetIds) ? payload.widgetIds : [];
    widgetIds.forEach(function (widgetId) {
      resetWidgetSettings(_KDB, widgetId, diagnostics);
    });
    const ok = diagnostics.length === 0;
    return { ok: ok, status: ok ? "success" : "error", diagnostics: diagnostics };
  }

  function resetWidgetSettings(_KDB, _widgetId, _diagnostics) {
    try {
      _controls.cleanupWidgetControls(_KDB, { widgetId: _widgetId, reason: "parameterSetReset" });
      const settings = _KDB.state.widgets && _KDB.state.widgets.settings ? _KDB.state.widgets.settings : null;
      if (settings && settings.byWidget && settings.byWidget[_widgetId]) {
        delete settings.byWidget[_widgetId];
      }
    } catch (err) {
      _diagnostics.push({
        code: RESET_FAILED,
        widgetId: _widgetId,
        message: "settings reset failed: " + String(err && err.message ? err.message : err)
      });
    }
  }

  async function handleParameterSetRestoreBatch(_KDB, _payload) {
    const payload = _payload || {};
    const diagnostics = [];
    const applied = [];
    const skipped = [];
    let degraded = false;
    if (typeof payload.runId !== "number") {
      return fail(diagnostics, "widgetSettings/parameterSetRestoreBatchRequested requires a numeric runId");
    }
    const runtime = _runtime.ensureWidgetSettingsRuntime(_KDB);
    if (!claimParameterSetRun(runtime, payload.runId)) {
      return cancelled(payload.runId, runtime.parameterSetRunId, diagnostics, applied, skipped);
    }
    if (!payload.widgetCorrelation || typeof payload.widgetCorrelation !== "object") {
      return fail(diagnostics, "widgetCorrelation is required for widgetSettings parameter set restore");
    }
    const widgets = Array.isArray(payload.widgets) ? payload.widgets : [];
    for (let idx = 0; idx < widgets.length; idx += 1) {
      if (runtime.parameterSetRunId !== payload.runId) {
        return cancelled(payload.runId, runtime.parameterSetRunId, diagnostics, applied, skipped);
      }
      const entry = widgets[idx] || {};
      const entryIndex = String(idx);
      const corr = payload.widgetCorrelation[entryIndex];
      if (!corr || !corr.widgetId) {
        skipped.push({ entryIndex: entryIndex, code: FAILED });
        diagnostics.push({ code: FAILED, entryIndex: entryIndex, message: "Missing widget correlation for entry." });
        degraded = true;
        continue;
      }
      const widgetId = String(corr.widgetId);
      if (reportUnsupportedKeys(entry, entry.kind, entryIndex, diagnostics)) {
        degraded = true;
      }
      const meta = { source: "writebackSet", runId: payload.runId, skipHistory: true, isParameterSetRestore: true };
      if (entry.kind === "vis") {
        const visResult = await commitVisAndConsequences(_KDB, widgetId, entry, meta, diagnostics, entryIndex);
        if (!visResult.ok) {
          return fail(diagnostics, "Vis-setting consequence failed.", applied, skipped);
        }
      } else if (entry.kind === "txt") {
        const txtResult = await commitTxtAndConsequences(_KDB, widgetId, entry, meta, diagnostics, entryIndex);
        if (!txtResult.ok) {
          return fail(diagnostics, "Text-setting consequence failed.", applied, skipped);
        }
      } else {
        skipped.push({ entryIndex: entryIndex, code: "WRITEBACK_WIDGET_KIND_UNSUPPORTED" });
        diagnostics.push({ code: "WRITEBACK_WIDGET_KIND_UNSUPPORTED", entryIndex: entryIndex, message: "Unsupported widget kind for settings restore." });
        degraded = true;
        continue;
      }
      if (runtime.parameterSetRunId !== payload.runId) {
        return cancelled(payload.runId, runtime.parameterSetRunId, diagnostics, applied, skipped);
      }
      if (applied.indexOf(widgetId) === -1) {
        applied.push(widgetId);
      }
    }
    return { ok: true, degraded: degraded, applied: applied, skipped: skipped, diagnostics: diagnostics };
  }

  function reportUnsupportedKeys(_entry, _kind, _entryIndex, _diagnostics) {
    const allowed = _kind === "txt" ? TXT_KEYS : VIS_KEYS;
    let sawUnsupported = false;
    Object.keys(_entry || {}).forEach(function (key) {
      if (!allowed[key]) {
        sawUnsupported = true;
        _diagnostics.push({
          code: FAILED,
          entryIndex: _entryIndex,
          setting: key,
          message: "Unsupported setting key for widgetSettings restore: " + key
        });
      }
    });
    return sawUnsupported;
  }

  function fail(_diagnostics, _message, _applied, _skipped) {
    _diagnostics.push({ code: FAILED, message: _message });
    return { ok: false, applied: _applied || [], skipped: _skipped || [], diagnostics: _diagnostics };
  }

  function cancelled(_runId, _activeRunId, _diagnostics, _applied, _skipped) {
    _diagnostics.push({ code: CANCELLED, message: "stale parameterSet runId " + _runId + " superseded by " + _activeRunId });
    return { ok: false, applied: _applied || [], skipped: _skipped || [], diagnostics: _diagnostics };
  }

  async function commitVisAndConsequences(_KDB, _widgetId, _entry, _meta, _diagnostics, _entryIndex) {
    commitRequiredSetting(_KDB, _widgetId, "visualization", _entry, "type", VIS_DEFAULTS.visualization);
    commitRequiredSetting(_KDB, _widgetId, "dimension", _entry, "dim", VIS_DEFAULTS.dimension);
    commitRequiredSetting(_KDB, _widgetId, "topN", _entry, "topn", VIS_DEFAULTS.topN);
    VIS_FLAG_FIELDS.forEach(function (pair) {
      if (hasField(_entry, pair[0])) {
        commitDirect(_KDB, _widgetId, pair[1], _entry[pair[0]] === 1);
      }
    });
    if (hasField(_entry, "grp") && _visTypeRules.isAllowedGrain(_visSelectors.readVisPropBucketKey(_KDB, _entry.type), _entry.grp)) {
      commitDirect(_KDB, _widgetId, "grouping", _entry.grp);
    }
    stampPanelIfMounted(_KDB, _widgetId);
    if (!hasField(_entry, "ctcol")) {
      return { ok: true };
    }
    commitDirect(_KDB, _widgetId, "backgroundColor", _entry.ctcol);
    const action = {
      type: "widgetBase/applyColour",
      widgetId: _widgetId,
      payload: Object.assign({ optionValue: _entry.ctcol, widgetType: "vis" }, _meta || {})
    };
    return consequence(_KDB, "widgetBase", action, _diagnostics, _entryIndex, "ctcol");
  }

  async function commitTxtAndConsequences(_KDB, _widgetId, _entry, _meta, _diagnostics, _entryIndex) {
    commitRequiredSetting(_KDB, _widgetId, "fontSize", _entry, "fsize", TXT_DEFAULTS.fontSize);
    commitRequiredSetting(_KDB, _widgetId, "layout", _entry, "style", TXT_DEFAULTS.layout);
    commitRequiredSetting(_KDB, _widgetId, "backgroundColor", _entry, "bgcol", TXT_DEFAULTS.backgroundColor);
    if (hasField(_entry, "fsize")) {
      const fontAction = { type: "widgetText/applyFontSize", widgetId: _widgetId, payload: Object.assign({ nextValue: _entry.fsize }, _meta || {}) };
      const fontResult = await consequence(_KDB, "widgetText", fontAction, _diagnostics, _entryIndex, "fsize");
      if (!fontResult.ok) {
        return fontResult;
      }
    }
    if (hasField(_entry, "style")) {
      const styleAction = { type: "widgetText/applyRestyle", widgetId: _widgetId, payload: Object.assign({ nextValue: _entry.style }, _meta || {}) };
      const styleResult = await consequence(_KDB, "widgetText", styleAction, _diagnostics, _entryIndex, "style");
      if (!styleResult.ok) {
        return styleResult;
      }
    }
    if (!hasField(_entry, "bgcol")) {
      return { ok: true };
    }
    const colourAction = {
      type: "widgetBase/applyColour",
      widgetId: _widgetId,
      payload: Object.assign({ optionValue: _entry.bgcol, widgetType: "text" }, _meta || {})
    };
    return consequence(_KDB, "widgetBase", colourAction, _diagnostics, _entryIndex, "bgcol");
  }

  function commitRequiredSetting(_KDB, _widgetId, _kind, _entry, _field, _defaultValue) {
    commitDirect(_KDB, _widgetId, _kind, hasField(_entry, _field) ? _entry[_field] : _defaultValue);
  }

  function commitDirect(_KDB, _widgetId, _kind, _value) {
    _state.commitWidgetSettingValue(_KDB, _widgetId, _kind, _value, { nextValue: _value });
  }

  function stampPanelIfMounted(_KDB, _widgetId) {
    const panel = _placementContext.resolvePanel(_KDB, _widgetId);
    if (panel) {
      _optionMarking.stampPanelVisType(_KDB, panel);
    }
  }

  async function consequence(_KDB, _apiKey, _action, _diagnostics, _entryIndex, _setting) {
    const api = _KDB.api && _KDB.api[_apiKey];
    if (!api || typeof api.dispatch !== "function") {
      _diagnostics.push({ code: FAILED, entryIndex: _entryIndex, setting: _setting, message: _apiKey + " dispatch API is unavailable." });
      return { ok: false };
    }
    const result = await Promise.resolve(api.dispatch(_action));
    if (!result || result.ok !== true) {
      _diagnostics.push({ code: FAILED, entryIndex: _entryIndex, setting: _setting, message: "Consequence dispatch failed." });
      return { ok: false };
    }
    return { ok: true };
  }

  async function restoreCommittedSettingsOnHistoryReplay(_KDB, _payload) {
    const payload = _payload || {};
    const widgetId = String(payload.widgetId || payload.id || "");
    const kind = String(payload.kind || "").toLowerCase();
    if (!widgetId) {
      return { ok: false, reasonCode: "WIDGET_SETTINGS_RESTORE_TARGET_MISSING" };
    }
    if (payload.isHistoryReplay !== true && payload.source !== "historyReplay") {
      return { ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_RESTORE_SOURCE_INVALID" };
    }
    if (kind === "vis") {
      const readiness = await _seed.waitForVisualContentReady(_KDB, widgetId);
      if (!readiness.ok) {
        return { ok: false, widgetId: widgetId, reasonCode: readiness.errorCode };
      }
    }
    await restoreCommittedColour(_KDB, widgetId, kind === "text" ? "text" : "live");
    if (kind !== "vis") {
      return { ok: true, widgetId: widgetId };
    }
    const batch = _visSnapshot.buildCommittedRestoreBatch(_KDB, widgetId);
    const result = await _dispatchIntent.historyReplayVisBatch(_KDB, widgetId, batch);
    const ok = !!(result && result.ok === true);
    if (ok) {
      _optionMarking.stampPanelVisType(_KDB, widgetId);
    }
    return { ok: ok, widgetId: widgetId };
  }

  function restoreCommittedColour(_KDB, widgetId, widgetType) {
    const record = _state.ensureWidgetSettingsByWidget(_KDB, widgetId);
    const meta = record.colourMeta && typeof record.colourMeta === "object" ? record.colourMeta : {};
    if (record.colour == null && !meta.optionKey) {
      return Promise.resolve();
    }
    return Promise.resolve(_colour.handleCommitColour(_KDB, {
      widgetId: widgetId,
      widgetType: widgetType,
      optionKey: meta.optionKey || "",
      optionValue: record.colour != null ? String(record.colour) : "",
      source: "historyReplay",
      isHistoryReplay: true
    }));
  }

  return {
    handleParameterSetReset: handleParameterSetReset,
    handleParameterSetRestoreBatch: handleParameterSetRestoreBatch,
    restoreCommittedSettingsOnHistoryReplay: restoreCommittedSettingsOnHistoryReplay
  };
});
