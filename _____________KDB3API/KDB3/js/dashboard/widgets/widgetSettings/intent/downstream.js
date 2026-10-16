define([
  "../config.js",
  "./visSnapshot.js",
  "../../widgetVis/selectors.js"
], function (_config, _visSnapshot, _visSelectors) {
  "use strict";

  const warnedMissingApi = {};
  const BOOLEAN_KINDS = ["showValues", "iterator", "zoom", "valueCaption"];
  const TRUE_TOKENS = ["on", "true", "iter-on", "zoom-on", "vcap-on"];
  const FALSE_TOKENS = ["off", "false", "iter-off", "zoom-off", "vcap-off"];
  const INHERIT_TOKENS = ["inherit", "iter-inherit", "zoom-inherit", "vcap-inherit"];

  function resolveCanonicalVisOptionValue(_planned) {
    const planned = _planned || {};
    const kind = _config.normalizeKind(planned.kind);
    const raw = planned.optionValue != null && planned.optionValue !== "" ? planned.optionValue : planned.optionKey;
    const token = String(raw).toLowerCase();
    if (kind === "topN" && planned.optionKey) {
      return planned.optionKey;
    }
    if (BOOLEAN_KINDS.indexOf(kind) >= 0) {
      if (TRUE_TOKENS.indexOf(token) >= 0) {
        return true;
      }
      if (FALSE_TOKENS.indexOf(token) >= 0) {
        return false;
      }
      if (INHERIT_TOKENS.indexOf(token) >= 0) {
        return "inherit";
      }
    }
    return planned.optionValue;
  }

  function buildDownstreamIntentAction(_KDB, _planned) {
    const planned = _planned || {};
    const payload = {
      widgetId: planned.widgetId,
      widgetType: planned.widgetType,
      kind: planned.kind,
      isHistoryReplay: planned.isHistoryReplay === true,
      source: planned.source || "widgetSettings"
    };
    applyMaximizeIntentPayload(_KDB, payload, planned);
    if (planned.interaction === "iconClick") {
      payload.action = planned.action || null;
    } else {
      payload.optionKey = planned.optionKey || "";
      payload.optionValue = planned.optionValue || "";
    }
    if (planned.target === "widgetVis" && _config.isWidgetVisKind(planned.kind)) {
      const visPayload = _visSnapshot.build(_KDB, planned.widgetId, planned.kind, resolveCanonicalVisOptionValue(planned));
      payload.control = visPayload.control;
      payload.previousValue = visPayload.previousValue;
      payload.nextValue = visPayload.nextValue;
      payload.settingsSnapshot = visPayload.settingsSnapshot;
      if (planned.coupledTopN) {
        payload.nextValue = "none";
        payload.settingsSnapshot.dimension = "none";
        payload.settingsSnapshot.topNChoice = "none";
      }
    }
    applyLayoutIntentPayload(payload, planned);
    return {
      type: planned.type,
      widgetId: planned.widgetId,
      payload: payload
    };
  }

  function applyLayoutIntentPayload(payload, planned) {
    const normalizedKind = _config.normalizeKind(planned.kind);
    if (normalizedKind === "move") {
      payload.mode = planned.interaction === "dropdownOption"
        ? normalizeMoveMode(planned.optionValue || planned.optionKey)
        : "oneShot";
      return;
    }
    if (normalizedKind === "resize") {
      payload.enabled = planned.enabled !== false && String(planned.optionValue || "").toLowerCase() !== "false";
    }
  }

  function normalizeMoveMode(mode) {
    const low = String(mode || "").trim().toLowerCase();
    if (low === "oneshot" || low === "einmalig") {
      return "oneShot";
    }
    if (low === "persistent" || low === "aktiv" || low === "aan") {
      return "persistent";
    }
    return "default";
  }

  function applyMaximizeIntentPayload(_KDB, payload, planned) {
    const normalizedKind = _config.normalizeKind(planned.kind);
    if (normalizedKind === "unmaximize") {
      payload.nextMaximized = false;
      return;
    }
    if (normalizedKind === "maximize") {
      payload.nextMaximized = !_visSelectors.readVisMaximized(_KDB, planned.widgetId);
    }
  }

  function dispatchToTargetApi(_KDB, _target, _action) {
    try {
      const target = String(_target || "");
      const api = _KDB && _KDB.api ? _KDB.api[target] : null;
      if (!api || typeof api.dispatch !== "function") {
        warnMissingApiOnce(target);
        return { ok: false, skipped: true, reasonCode: "API_MISSING", target: target };
      }
      return api.dispatch(_action);
    } catch (err) {
      console.error("[widgetSettings.dispatchToTargetApi] failed", { target: _target }, err);
      return { ok: false, skipped: true, reasonCode: "DISPATCH_ERROR", target: _target };
    }
  }

  function warnMissingApiOnce(target) {
    if (!target || warnedMissingApi[target] === true) {
      return;
    }
    warnedMissingApi[target] = true;
    console.warn("[widgetSettings.dispatch] missing _KDB.api." + target + ".dispatch; downstream intent skipped");
  }

  function dispatchVisSettingsBatch(_KDB, _widgetId, _batchPayload, _source, _isHistoryReplay) {
    const widgetId = String(_widgetId || "");
    const batchPayload = _batchPayload || {};
    const action = {
      type: "widgetVis/applyStartupSettings",
      widgetId: widgetId,
      payload: {
        source: _source,
        isHistoryReplay: _isHistoryReplay === true,
        settingsSnapshot: batchPayload.settingsSnapshot,
        changedControls: batchPayload.changedControls || []
      }
    };
    return Promise.resolve(dispatchToTargetApi(_KDB, "widgetVis", action));
  }

  function dispatchStartupVisBatch(_KDB, _widgetId, _widgetType, _batchPayload) {
    void _widgetType;
    return dispatchVisSettingsBatch(_KDB, _widgetId, _batchPayload, "startup", false);
  }

  function dispatchHistoryReplayVisBatch(_KDB, _widgetId, _batchPayload) {
    return dispatchVisSettingsBatch(_KDB, _widgetId, _batchPayload, "historyReplay", true);
  }

  return {
    resolveCanonicalVisOptionValue: resolveCanonicalVisOptionValue,
    buildDownstreamIntentAction: buildDownstreamIntentAction,
    dispatchToTargetApi: dispatchToTargetApi,
    dispatchStartupVisBatch: dispatchStartupVisBatch,
    dispatchHistoryReplayVisBatch: dispatchHistoryReplayVisBatch
  };
});
