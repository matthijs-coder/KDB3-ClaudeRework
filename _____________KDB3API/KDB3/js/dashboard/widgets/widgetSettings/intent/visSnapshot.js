define([
  "../config/dropdownDefaults.js",
  "../config.js",
  "../state.js"
], function (_dropdownDefaults, _config, _state) {
  "use strict";

  const VIS_DEFAULTS = {
    dimension: _dropdownDefaults.dimension.useValue,
    visType: _dropdownDefaults.visualization.useValue,
    topNChoice: _dropdownDefaults.topN.useValue
  };
  const BOOLEAN_CONTROLS = ["showValues", "iterator", "zoom", "valueCaption"];
  const GROUPING_GRAINS = ["stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV"];

  function readEffectiveControlValue(_record, _stateKey) {
    if (_record && _record[_stateKey] != null) {
      return _record[_stateKey];
    }
    return VIS_DEFAULTS[_stateKey] != null ? VIS_DEFAULTS[_stateKey] : null;
  }

  function buildEffectiveVisSnapshot(_record) {
    const snapshot = {
      dimension: readEffectiveControlValue(_record, "dimension"),
      visType: readEffectiveControlValue(_record, "visType"),
      topNChoice: readEffectiveControlValue(_record, "topNChoice")
    };
    BOOLEAN_CONTROLS.forEach(function (control) {
      if (_record && typeof _record[control] === "boolean") {
        snapshot[control] = _record[control];
      }
    });
    if (_record && GROUPING_GRAINS.indexOf(_record.grouping) >= 0) {
      snapshot.grouping = _record.grouping;
    }
    return snapshot;
  }

  function buildRestoreControlEntry(_kind, _value) {
    const kind = _config.normalizeKind(_kind);
    return {
      kind: kind,
      control: _config.controlForKind(kind),
      previousValue: _value,
      nextValue: _value
    };
  }

  function buildCommittedRestoreBatch(_KDB, _widgetId) {
    const record = _state.ensureWidgetSettingsByWidget(_KDB, _widgetId);
    const snapshot = buildEffectiveVisSnapshot(record);
    const changedControls = [
      buildRestoreControlEntry("dimension", snapshot.dimension),
      buildRestoreControlEntry("visualization", snapshot.visType),
      buildRestoreControlEntry("topN", snapshot.topNChoice)
    ];
    BOOLEAN_CONTROLS.forEach(function (control) {
      if (typeof snapshot[control] === "boolean") {
        changedControls.push(buildRestoreControlEntry(control, snapshot[control]));
      }
    });
    if (GROUPING_GRAINS.indexOf(snapshot.grouping) >= 0) {
      changedControls.push(buildRestoreControlEntry("grouping", snapshot.grouping));
    }
    return {
      settingsSnapshot: snapshot,
      changedControls: changedControls
    };
  }

  function buildStartupBatch(_KDB, _widgetId, _descriptors) {
    const record = _state.ensureWidgetSettingsByWidget(_KDB, _widgetId);
    const snapshot = buildEffectiveVisSnapshot(record);
    const changedControls = [];
    (_descriptors || []).forEach(function (descriptor) {
      const kind = _config.normalizeKind(descriptor.kind);
      const control = _config.controlForKind(kind);
      if (!control || control === "grouping" || BOOLEAN_CONTROLS.indexOf(control) >= 0) {
        return;
      }
      const previousValue = snapshot[control];
      const nextValue = descriptor.optionValue != null ? descriptor.optionValue : snapshot[control];
      snapshot[control] = nextValue;
      changedControls.push({
        kind: kind,
        control: control,
        previousValue: previousValue,
        nextValue: nextValue
      });
    });
    return {
      settingsSnapshot: snapshot,
      changedControls: changedControls
    };
  }

  function build(_KDB, _widgetId, _kind, _nextValue) {
    const control = _config.controlForKind(_kind);
    const record = _state.ensureWidgetSettingsByWidget(_KDB, _widgetId);
    const snapshot = buildEffectiveVisSnapshot(record);
    let previousValue = null;
    if (control) {
      previousValue = snapshot[control];
      if (BOOLEAN_CONTROLS.indexOf(control) >= 0 && typeof previousValue !== "boolean") {
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
    build: build,
    buildStartupBatch: buildStartupBatch,
    buildCommittedRestoreBatch: buildCommittedRestoreBatch
  };
});
