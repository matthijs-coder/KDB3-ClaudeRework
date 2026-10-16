define([
  "./state.js",
  "./history.js"
], function (_state, _history) {
  "use strict";

  function handleCommitColour(_KDB, _payload) {
    try {
      const payload = _payload || {};
      const widgetId = String(payload.widgetId || "");
      if (!widgetId) {
        return Promise.resolve({ ok: false, reasonCode: "WIDGET_SETTINGS_COLOUR_TARGET_MISSING" });
      }
      return runCommitColour(_KDB, widgetId, payload);
    } catch (err) {
      console.error("[widgetSettings.handleCommitColour] failed", err);
      return Promise.resolve({ ok: false, reasonCode: "WIDGET_SETTINGS_COLOUR_ERROR", errorMessage: String(err.message || err) });
    }
  }

  function runCommitColour(_KDB, widgetId, payload) {
    const optionKey = String(payload.optionKey || "");
    const optionValue = payload.optionValue != null ? String(payload.optionValue) : "";
    const source = String(payload.source || "widgetSettings");
    const isHistoryReplay = payload.isHistoryReplay === true;
    const record = _state.ensureWidgetSettingsByWidget(_KDB, widgetId);
    const oldColour = record.colour != null ? String(record.colour) : "";
    const oldMeta = record.colourMeta && typeof record.colourMeta === "object" ? record.colourMeta : {};
    record.pending.kind = "backgroundColor";

    const baseApi = _KDB.api && _KDB.api.widgetBase;
    if (!baseApi || typeof baseApi.dispatch !== "function") {
      return finishFailure(record, "WIDGET_SETTINGS_WIDGET_BASE_API_MISSING", "widgetBase dispatch is not available.");
    }
    const action = {
      type: "widgetBase/setColour",
      widgetId: widgetId,
      payload: {
        optionValue: optionValue,
        widgetType: payload.widgetType || null,
        source: source,
        isHistoryReplay: isHistoryReplay
      }
    };
    return Promise.resolve(baseApi.dispatch(action)).then(function (applyResult) {
      const result = applyResult || {};
      if (result.ok !== true) {
        return finishFailure(
          record,
          result.errorCode || "WIDGET_SETTINGS_COLOUR_APPLY_FAILED",
          result.errorMessage || "widgetBase colour apply did not succeed."
        );
      }
      _state.commitWidgetSettingValue(_KDB, widgetId, "backgroundColor", optionValue, {
        control: { optionKey: optionKey, displayValue: payload.displayValue || optionValue },
        nextValue: optionValue
      });
      if (!isHistoryReplay && source !== "startup") {
        _history.pushWidgetSettingsHistoryStep(
          _KDB,
          buildHistoryFrame(widgetId, oldMeta.optionKey, oldColour),
          buildHistoryFrame(widgetId, optionKey, optionValue),
          { isHistoryReplay: false }
        );
      }
      const committedColour = result.colour || optionValue;
      applyReadableTextColour(_KDB, widgetId, payload, committedColour);
      return { ok: true, widgetId: widgetId, colour: committedColour };
    }).catch(function (err) {
      console.error("[widgetSettings.runCommitColour] apply failed", { widgetId: widgetId }, err);
      return finishFailure(record, "WIDGET_SETTINGS_COLOUR_APPLY_ERROR", String(err.message || err));
    });
  }

  function buildHistoryFrame(widgetId, optionKey, optionValue) {
    return {
      widgetId: widgetId,
      kind: "backgroundColor",
      optionKey: optionKey || "",
      optionValue: optionValue != null ? String(optionValue) : ""
    };
  }

  // Fire-and-forget: a text widget gets a readable text colour for its new background.
  function applyReadableTextColour(_KDB, widgetId, payload, backgroundHex) {
    try {
      const readableFn = _KDB.utils && _KDB.utils.readableTextColorForHex;
      const textApi = _KDB.api && _KDB.api.widgetText;
      if (String(payload.widgetType || "").toLowerCase() !== "text"
        || typeof readableFn !== "function"
        || !backgroundHex
        || !textApi
        || typeof textApi.dispatch !== "function") {
        return;
      }
      Promise.resolve(textApi.dispatch({
        type: "widgetText/applyReadableTextColor",
        widgetId: widgetId,
        payload: { textColor: readableFn(backgroundHex) }
      })).catch(function (err) {
        console.warn("[widgetSettings.applyReadableTextColor] failed", { widgetId: widgetId }, err);
      });
    } catch (err) {
      console.warn("[widgetSettings.applyReadableTextColor] failed", { widgetId: widgetId }, err);
    }
  }

  function finishFailure(record, errorCode, errorMessage) {
    record.pending.kind = null;
    record.errorCode = String(errorCode || "WIDGET_SETTINGS_COLOUR_APPLY_FAILED");
    record.errorMessage = errorMessage ? String(errorMessage) : null;
    return { ok: false, errorCode: record.errorCode, errorMessage: record.errorMessage };
  }

  return {
    handleCommitColour: handleCommitColour
  };
});
