define([
  "../config/intentDispatchMap.js",
  "./buildWidgetSettingsIntentDescriptor.js",
  "./dispatchToTargetApi.js",
  "./orchestrateResetToLaunchpad.js",
  "./buildDownstreamIntentAction.js",
  "./finalizeVisIntentResult.js",
  "./dispatchVisSettingsBatch.js",
  "./readSettingsPanelIconAttrs.js",
  "./validateTopNGroupingDimension.js"
], function (_intentDispatchMap, _descriptor, _dispatchToTargetApi, _orchestrateResetToLaunchpad, _buildDownstreamIntentAction, _finalizeVisIntentResult, _dispatchVisSettingsBatch, _readPanelIconAttrs, _validateTopNGroupingDimension) {
  function dispatchIconIntent(_KDB, _panel, _icon, _options) {
    try {
      const options = _options || {};
      const context = _descriptor.panelContext(_panel);
      const kind = _readPanelIconAttrs.readIconKind(_icon);
      const action = _readPanelIconAttrs.readIconAction(_icon);
      if (!kind && !action) {
        return null;
      }
      const intent = {
        widgetId: context.widgetId,
        widgetType: context.widgetType,
        interaction: "iconClick",
        kind: kind || action,
        action: action || null,
        isHistoryReplay: options.isHistoryReplay === true,
        source: "widgetSettings"
      };
      return executeIntent(_KDB, intent);
    } catch (err) {
      console.error("[widgetSettings.dispatchIconIntent] failed", err);
      return null;
    }
  }

  function dispatchDropdownOptionIntent(_KDB, _panel, _option, _options) {
    try {
      const options = _options || {};
      const descriptor = _descriptor.fromOption(_panel, _option);
      if (!descriptor) {
        return null;
      }
      const intent = {
        widgetId: descriptor.widgetId,
        widgetType: descriptor.widgetType,
        interaction: "dropdownOption",
        kind: descriptor.kind,
        optionKey: descriptor.optionKey,
        optionValue: descriptor.optionValue,
        isHistoryReplay: options.isHistoryReplay === true,
        source: "widgetSettings"
      };
      return executeIntent(_KDB, intent);
    } catch (err) {
      console.error("[widgetSettings.dispatchDropdownOptionIntent] failed", err);
      return null;
    }
  }

  function executeIntent(_KDB, _intent) {
    try {
      const intent = _intent || {};
      if (intent.interaction === "iconClick" && _intentDispatchMap.normalizeKind(intent.kind || intent.action) === "reset") {
        return _orchestrateResetToLaunchpad(_KDB, intent);
      }
      const target = _intentDispatchMap.resolveTarget(intent.widgetType, intent.kind);
      const type = _intentDispatchMap.resolveType(target, intent.kind, intent.interaction);
      const planned = Object.assign({}, intent, { target: target, type: type });
      const blocked = _validateTopNGroupingDimension(_KDB, planned);
      if (blocked) {
        return blocked;
      }
      const dispatchResult = _dispatchToTargetApi(_KDB, target, _buildDownstreamIntentAction(_KDB, planned));
      return _finalizeVisIntentResult(_KDB, planned, dispatchResult);
    } catch (err) {
      console.error("[widgetSettings.executeIntent] failed", err);
      return { ok: false, skipped: true, reasonCode: "INTENT_ERROR" };
    }
  }

  function dispatchStartupDefault(_KDB, _descriptor) {
    try {
      const descriptor = _descriptor || {};
      const intent = {
        widgetId: descriptor.widgetId,
        widgetType: descriptor.widgetType,
        interaction: "dropdownOption",
        kind: descriptor.kind,
        optionKey: descriptor.optionKey,
        optionValue: descriptor.optionValue,
        isHistoryReplay: false,
        source: "startup"
      };
      return Promise.resolve(executeIntent(_KDB, intent));
    } catch (err) {
      console.error("[widgetSettings.dispatchStartupDefault] failed", err);
      return Promise.resolve({ ok: false, skipped: true, reasonCode: "STARTUP_INTENT_ERROR" });
    }
  }

  return {
    icon: dispatchIconIntent,
    dropdownOption: dispatchDropdownOptionIntent,
    startupDefault: dispatchStartupDefault,
    startupVisBatch: _dispatchVisSettingsBatch.dispatchStartupVisBatch,
    historyReplayVisBatch: _dispatchVisSettingsBatch.dispatchHistoryReplayVisBatch,
    buildDropdownDescriptorFromOption: _descriptor.fromOption,
    buildDropdownDescriptorFromParts: _descriptor.fromParts
  };
});
