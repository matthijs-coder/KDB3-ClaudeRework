define([
  "../config.js",
  "../intent/descriptor.js",
  "../intent/downstream.js",
  "../intent/resetToLaunchpad.js",
  "../intent/finalize.js",
  "../intent/topNGrouping.js"
], function (_config, _descriptor, _downstream, _resetToLaunchpad, _finalize, _topNGrouping) {
  "use strict";

  function dispatchIconIntent(_KDB, _panel, _icon, _options) {
    try {
      const options = _options || {};
      const context = _descriptor.panelContext(_panel);
      const kind = _descriptor.readIconKind(_icon);
      const action = _descriptor.readIconAction(_icon);
      if (!kind && !action) {
        return null;
      }
      return executeIntent(_KDB, {
        widgetId: context.widgetId,
        widgetType: context.widgetType,
        interaction: "iconClick",
        kind: kind || action,
        action: action || null,
        isHistoryReplay: options.isHistoryReplay === true,
        source: "widgetSettings"
      });
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
      if (options.restoreControls) {
        intent.restoreControls = options.restoreControls;
      }
      return executeIntent(_KDB, intent);
    } catch (err) {
      console.error("[widgetSettings.dispatchDropdownOptionIntent] failed", err);
      return null;
    }
  }

  function executeIntent(_KDB, _intent) {
    try {
      const intent = _intent || {};
      if (intent.interaction === "iconClick" && _config.normalizeKind(intent.kind || intent.action) === "reset") {
        return _resetToLaunchpad.orchestrateResetToLaunchpad(_KDB, intent);
      }
      const target = _config.resolveTarget(intent.widgetType, intent.kind);
      const type = _config.resolveType(target, intent.kind, intent.interaction);
      if (!type) {
        return { ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_KIND_UNSUPPORTED", kind: intent.kind || null };
      }
      const planned = Object.assign({}, intent, { target: target, type: type });
      const blocked = _topNGrouping.validateTopNGroupingDimension(_KDB, planned);
      if (blocked) {
        return blocked;
      }
      const dispatchResult = _downstream.dispatchToTargetApi(_KDB, target, _downstream.buildDownstreamIntentAction(_KDB, planned));
      return _finalize.finalizeVisIntentResult(_KDB, planned, dispatchResult);
    } catch (err) {
      console.error("[widgetSettings.executeIntent] failed", err);
      return { ok: false, skipped: true, reasonCode: "INTENT_ERROR" };
    }
  }

  function dispatchStartupDefault(_KDB, _descriptor) {
    const descriptor = _descriptor || {};
    return Promise.resolve(executeIntent(_KDB, {
      widgetId: descriptor.widgetId,
      widgetType: descriptor.widgetType,
      interaction: "dropdownOption",
      kind: descriptor.kind,
      optionKey: descriptor.optionKey,
      optionValue: descriptor.optionValue,
      isHistoryReplay: false,
      source: "startup"
    }));
  }

  return {
    icon: dispatchIconIntent,
    dropdownOption: dispatchDropdownOptionIntent,
    startupDefault: dispatchStartupDefault,
    startupVisBatch: _downstream.dispatchStartupVisBatch,
    historyReplayVisBatch: _downstream.dispatchHistoryReplayVisBatch,
    buildDropdownDescriptorFromOption: _descriptor.fromOption,
    buildDropdownDescriptorFromParts: _descriptor.fromParts
  };
});
