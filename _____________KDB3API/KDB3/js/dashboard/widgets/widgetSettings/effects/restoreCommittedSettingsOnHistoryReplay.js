define([
  "../state/ensureWidgetSettingsByWidget.js",
  "../effects/buildWidgetVisSettingsSnapshot.js",
  "../effects/waitForVisualContentReady.js",
  "../effects/dispatchWidgetSettingsIntent.js",
  "../actions/handleCommitColour.js",
  "../view/stampPanelVisType.js"
], function (_ensureByWidget, _visSnapshot, _waitForVisualContentReady, _dispatchIntent, _handleCommitColour, _stampPanelVisType) {
  "use strict";

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
      const readiness = await _waitForVisualContentReady(_KDB, widgetId);
      if (!readiness.ok) {
        return { ok: false, widgetId: widgetId, reasonCode: readiness.errorCode };
      }
    }
    await maybeRestoreColour(_KDB, widgetId, kind === "text" ? "text" : "live");
    if (kind !== "vis") {
      return { ok: true, widgetId: widgetId };
    }
    const batch = _visSnapshot.buildCommittedRestoreBatch(_KDB, widgetId);
    const result = await _dispatchIntent.historyReplayVisBatch(_KDB, widgetId, batch);
    const ok = !!(result && result.ok === true);
    if (ok) {
      stampPanelAfterRestore(_KDB, widgetId);
    }
    return { ok: ok, widgetId: widgetId };
  }

  function stampPanelAfterRestore(_KDB, _widgetId) {
    try {
      _stampPanelVisType(_KDB, _widgetId);
    } catch (err) {
      console.error("[widgetSettings.restoreCommittedSettingsOnHistoryReplay] stampPanelVisType failed", { widgetId: _widgetId }, err);
    }
  }

  function maybeRestoreColour(_KDB, widgetId, widgetType) {
    const record = _ensureByWidget(_KDB, widgetId);
    const meta = record.colourMeta && typeof record.colourMeta === "object" ? record.colourMeta : {};
    if (record.colour == null && !meta.optionKey) {
      return Promise.resolve();
    }
    return Promise.resolve(_handleCommitColour(_KDB, {
      widgetId: widgetId,
      widgetType: widgetType,
      optionKey: meta.optionKey || "",
      optionValue: record.colour != null ? String(record.colour) : "",
      source: "historyReplay",
      isHistoryReplay: true
    }));
  }

  return restoreCommittedSettingsOnHistoryReplay;
});
