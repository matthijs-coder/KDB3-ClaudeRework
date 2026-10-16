define([
  "../config/dropdownDefaults.js",
  "../config/intentDispatchMap.js",
  "../state/ensureWidgetSettingsByWidget.js",
  "./visKindToControl.js"
], function (_dropdownDefaults, _intentDispatchMap, _ensureByWidget, _visKindToControl) {
  "use strict";

  const VIS_DEFAULTS = {
    dimension: _dropdownDefaults.dimension.useValue,
    visType: _dropdownDefaults.visualization.useValue,
    topNChoice: _dropdownDefaults.topN.useValue
  };

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
    return appendExplicitVisOverrides(snapshot, _record);
  }

  function appendExplicitVisOverrides(_snapshot, _record) {
    if (_record && typeof _record.showValues === "boolean") {
      _snapshot.showValues = _record.showValues;
    }
    if (_record && typeof _record.iterator === "boolean") {
      _snapshot.iterator = _record.iterator;
    }
    if (_record && typeof _record.zoom === "boolean") {
      _snapshot.zoom = _record.zoom;
    }
    if (_record && typeof _record.valueCaption === "boolean") {
      _snapshot.valueCaption = _record.valueCaption;
    }
    if (_record && (_record.grouping === "stichtag" || _record.grouping === "jahr" || _record.grouping === "jahrStichtag" || _record.grouping === "stichtagProJahrH" || _record.grouping === "stichtagProJahrV")) {
      _snapshot.grouping = _record.grouping;
    }
    return _snapshot;
  }

  function buildCommittedRestoreBatch(_KDB, _widgetId) {
    const widgetId = String(_widgetId || "");
    const record = _ensureByWidget(_KDB, widgetId);
    const snapshot = buildEffectiveVisSnapshot(record);
    const changedControls = [
      buildRestoreControlEntry("dimension", snapshot.dimension),
      buildRestoreControlEntry("visualization", snapshot.visType),
      buildRestoreControlEntry("topN", snapshot.topNChoice)
    ];
    if (typeof snapshot.showValues === "boolean") {
      changedControls.push(buildRestoreControlEntry("showValues", snapshot.showValues));
    }
    if (typeof snapshot.iterator === "boolean") {
      changedControls.push(buildRestoreControlEntry("iterator", snapshot.iterator));
    }
    if (typeof snapshot.zoom === "boolean") {
      changedControls.push(buildRestoreControlEntry("zoom", snapshot.zoom));
    }
    if (typeof snapshot.valueCaption === "boolean") {
      changedControls.push(buildRestoreControlEntry("valueCaption", snapshot.valueCaption));
    }
    if (snapshot.grouping === "stichtag" || snapshot.grouping === "jahr" || snapshot.grouping === "jahrStichtag" || snapshot.grouping === "stichtagProJahrH" || snapshot.grouping === "stichtagProJahrV") {
      changedControls.push(buildRestoreControlEntry("grouping", snapshot.grouping));
    }
    return {
      settingsSnapshot: snapshot,
      changedControls: changedControls
    };
  }

  function buildRestoreControlEntry(_kind, _value) {
    const kind = _intentDispatchMap.normalizeKind(_kind);
    const control = _visKindToControl.kindToControl(kind);
    return {
      kind: kind,
      control: control,
      previousValue: _value,
      nextValue: _value
    };
  }

  return {
    buildCommittedRestoreBatch: buildCommittedRestoreBatch,
    buildEffectiveVisSnapshot: buildEffectiveVisSnapshot
  };
});
