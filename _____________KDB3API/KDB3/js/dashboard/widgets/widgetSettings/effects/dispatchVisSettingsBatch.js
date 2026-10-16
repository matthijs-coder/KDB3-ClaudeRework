define([
  "./dispatchToTargetApi.js"
], function (_dispatchToTargetApi) {
  function dispatchVisSettingsBatch(_KDB, _widgetId, _batchPayload, _source, _isHistoryReplay) {
    try {
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
      return Promise.resolve(_dispatchToTargetApi(_KDB, "widgetVis", action));
    } catch (err) {
      console.error("[widgetSettings.dispatchVisSettingsBatch] failed", err);
      return Promise.resolve({ ok: false, skipped: true, reasonCode: "VIS_BATCH_DISPATCH_ERROR" });
    }
  }

  function dispatchStartupVisBatch(_KDB, _widgetId, _widgetType, _batchPayload) {
    void _widgetType;
    return dispatchVisSettingsBatch(_KDB, _widgetId, _batchPayload, "startup", false);
  }

  function dispatchHistoryReplayVisBatch(_KDB, _widgetId, _batchPayload) {
    return dispatchVisSettingsBatch(_KDB, _widgetId, _batchPayload, "historyReplay", true);
  }

  return {
    dispatchStartupVisBatch: dispatchStartupVisBatch,
    dispatchHistoryReplayVisBatch: dispatchHistoryReplayVisBatch
  };
});
