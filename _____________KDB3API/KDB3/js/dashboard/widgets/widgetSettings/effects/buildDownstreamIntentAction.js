define([
  "../config/intentDispatchMap.js",
  "./buildWidgetVisSettingsSnapshot.js",
  "./resolveCanonicalVisOptionValue.js"
], function (_intentDispatchMap, _visSnapshot, _resolveCanonicalVisOptionValue) {
  function buildDownstreamIntentAction(_KDB, _planned) {
    const planned = _planned || {};
    const canonicalOptionValue = _resolveCanonicalVisOptionValue(planned);
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
    if (planned.target === "widgetVis" && _visSnapshot.isWidgetVisKind(planned.kind)) {
      const visPayload = _visSnapshot.build(
        _KDB,
        planned.widgetId,
        planned.kind,
        canonicalOptionValue
      );
      payload.control = visPayload.control;
      payload.previousValue = visPayload.previousValue;
      payload.nextValue = visPayload.nextValue;
      payload.settingsSnapshot = visPayload.settingsSnapshot;
      if (planned.coupledTopN) {
        applyCoupledTopNSnapshot(payload);
      }
    }
    applyLayoutIntentPayload(payload, planned);
    return {
      type: planned.type,
      widgetId: planned.widgetId,
      payload: payload
    };
  }

  function applyCoupledTopNSnapshot(payload) {
    try {
      payload.nextValue = "none";
      payload.settingsSnapshot.dimension = "none";
      payload.settingsSnapshot.topNChoice = "none";
    } catch (err) {
      console.error("[widgetSettings.applyCoupledTopNSnapshot] failed", err);
      throw err;
    }
  }

  function applyLayoutIntentPayload(payload, planned) {
    const normalizedKind = _intentDispatchMap.normalizeKind(planned.kind);
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
    const normalizedKind = _intentDispatchMap.normalizeKind(planned.kind);
    if (normalizedKind === "unmaximize") {
      payload.nextMaximized = false;
      return;
    }
    if (normalizedKind === "maximize") {
      payload.nextMaximized = !readVisMaximizedFromApi(_KDB, planned.widgetId);
    }
  }

  function readVisMaximizedFromApi(_KDB, widgetId) {
    const api = _KDB && _KDB.api ? _KDB.api.widgetVis : null;
    if (!api || typeof api.getState !== "function") {
      return false;
    }
    const state = api.getState();
    const record = state && state.byId ? state.byId[String(widgetId || "")] : null;
    return !!(record && record.maximized === true);
  }

  return buildDownstreamIntentAction;
});
