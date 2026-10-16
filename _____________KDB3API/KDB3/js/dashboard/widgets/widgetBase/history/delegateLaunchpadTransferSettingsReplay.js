define([
  "../view/resolveWidgetShell.js",
  "../effects/applyWidgetLayout.js",
  "../effects/dispatchWidgetSettingsPlaceControls.js",
  "./resolveCanvasLayoutFromFrame.js",
  "./dispatchWidgetBaseReplay.js"
], function (_resolveWidgetShellModule, _applyWidgetLayout, _dispatchWidgetSettingsPlaceControls, _layoutFrame, _dispatchReplay) {
  "use strict";

  const resolveWidgetShell = _resolveWidgetShellModule.resolveWidgetShell;

  function shouldDelegateSettings(oldFrame, newFrame) {
    const old = oldFrame || {};
    const next = newFrame || {};
    return old.requestedBy === "widgetSettings" || next.requestedBy === "widgetSettings";
  }

  function delegatePlaceControls(_KDB, widgetId, frame) {
    const value = frame || {};
    const kind = value.kind;
    if (kind !== "text" && kind !== "vis") {
      return Promise.resolve(false);
    }
    const shellEl = resolveWidgetShell(_KDB, widgetId);
    if (!shellEl) {
      return Promise.resolve(false);
    }
    return _dispatchWidgetSettingsPlaceControls(_KDB, {
      widgetId: widgetId,
      kind: kind,
      shellEl: shellEl,
      layout: _layoutFrame.resolveCanvasLayoutFromFrame(value),
      isHistoryReplay: true,
      source: "historyReplay"
    }).then(function (placeOk) {
      if (!placeOk) {
        return false;
      }
      return _dispatchReplay.dispatchWidgetSettingsReplay(_KDB, {
        type: "widgetSettings/restoreCommittedSettings",
        widgetId: widgetId,
        payload: {
          widgetId: widgetId,
          kind: kind,
          isHistoryReplay: true,
          source: "historyReplay"
        }
      }).then(function () {
        return reassertCanvasLayout(_KDB, widgetId, value);
      });
    });
  }

  function reassertCanvasLayout(_KDB, widgetId, frame) {
    const layout = _layoutFrame.resolveCanvasLayoutFromFrame(frame);
    if (!layout) {
      return Promise.resolve(true);
    }
    return Promise.resolve(_applyWidgetLayout(_KDB, widgetId, layout)).then(function (result) {
      return result && result.ok === true;
    });
  }

  function delegateCleanupControls(_KDB, widgetId) {
    return _dispatchReplay.dispatchWidgetSettingsReplay(_KDB, {
      type: "widgetSettings/cleanupWidgetControls",
      widgetId: widgetId,
      payload: {
        widgetId: widgetId,
        reason: "settingsDelete",
        requestedBy: "widgetSettings",
        isHistoryReplay: true
      }
    });
  }

  return {
    shouldDelegateSettings: shouldDelegateSettings,
    delegatePlaceControls: delegatePlaceControls,
    delegateCleanupControls: delegateCleanupControls
  };
});
