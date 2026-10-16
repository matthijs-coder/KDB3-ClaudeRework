define([
  "../config/intentDispatchMap.js",
  "../state/ensureWidgetSettingsByWidget.js",
  "./visKindToControl.js",
  "./buildCommittedRestoreBatch.js"
], function (_intentDispatchMap, _ensureByWidget, _visKindToControl, _buildCommittedRestoreBatch) {
  "use strict";

  function buildStartupBatch(_KDB, _widgetId, _descriptors) {
    const widgetId = String(_widgetId || "");
    const record = _ensureByWidget(_KDB, widgetId);
    const snapshot = _buildCommittedRestoreBatch.buildEffectiveVisSnapshot(record);
    const changedControls = [];
    const descriptors = _descriptors || [];
    let index = 0;
    while (index < descriptors.length) {
      const descriptor = descriptors[index];
      const kind = _intentDispatchMap.normalizeKind(descriptor.kind);
      const control = _visKindToControl.kindToControl(kind);
      if (control && control !== "showValues" && control !== "grouping" && control !== "iterator" && control !== "zoom" && control !== "valueCaption") {
        const previousValue = snapshot[control];
        const nextValue = descriptor.optionValue != null ? descriptor.optionValue : snapshot[control];
        snapshot[control] = nextValue;
        changedControls.push({
          kind: kind,
          control: control,
          previousValue: previousValue,
          nextValue: nextValue
        });
      }
      index += 1;
    }
    return {
      settingsSnapshot: snapshot,
      changedControls: changedControls
    };
  }

  function buildWidgetVisSettingsSnapshot(_KDB, _widgetId, _kind, _nextValue) {
    const widgetId = String(_widgetId || "");
    const control = _visKindToControl.kindToControl(_kind);
    const record = _ensureByWidget(_KDB, widgetId);
    const snapshot = _buildCommittedRestoreBatch.buildEffectiveVisSnapshot(record);
    let previousValue = null;
    if (control) {
      previousValue = snapshot[control];
      if ((control === "showValues" || control === "iterator" || control === "zoom" || control === "valueCaption") && typeof previousValue !== "boolean") {
        previousValue = null;
      }
      snapshot[control] = _nextValue != null ? _nextValue : snapshot[control];
    }
    return {
      control: control,
      previousValue: previousValue,
      nextValue: _nextValue,
      settingsSnapshot: snapshot
    };
  }

  return {
    build: buildWidgetVisSettingsSnapshot,
    buildStartupBatch: buildStartupBatch,
    buildCommittedRestoreBatch: _buildCommittedRestoreBatch.buildCommittedRestoreBatch,
    isWidgetVisKind: _visKindToControl.isWidgetVisKind
  };
});
