define([
  "../config/resolveVisualizationBindingConfig.js"
], function (_resolveVisualizationBindingConfig) {
  "use strict";

  var VIS_CONTROL_DEFAULTS = {
    dimension: "none",
    visType: "line",
    topNChoice: "none"
  };

  function copyOptionalVisOverrides(_source, _target) {
    if (_source && typeof _source.showValues === "boolean") {
      _target.showValues = _source.showValues;
    }
    if (_source && typeof _source.iterator === "boolean") {
      _target.iterator = _source.iterator;
    }
    if (_source && typeof _source.zoom === "boolean") {
      _target.zoom = _source.zoom;
    }
    if (_source && typeof _source.valueCaption === "boolean") {
      _target.valueCaption = _source.valueCaption;
    }
    if (_source && (_source.grouping === "stichtag" || _source.grouping === "jahr" || _source.grouping === "jahrStichtag" || _source.grouping === "stichtagProJahrH" || _source.grouping === "stichtagProJahrV")) {
      _target.grouping = _source.grouping;
    }
    return _target;
  }

  function readFromWidgetSettingsPublicApi(_KDB, _widgetId) {
    var settingsApi = _KDB && _KDB.api ? _KDB.api.widgetSettings : null;
    var settingsState;
    var record;
    if (!settingsApi || typeof settingsApi.getState !== "function") {
      return null;
    }
    settingsState = settingsApi.getState();
    record = settingsState && settingsState.byWidget ? settingsState.byWidget[_widgetId] : null;
    if (!record) {
      return null;
    }
    return copyOptionalVisOverrides(record, {
      dimension: record.dimension != null ? record.dimension : VIS_CONTROL_DEFAULTS.dimension,
      visType: record.visType != null ? record.visType : VIS_CONTROL_DEFAULTS.visType,
      topNChoice: record.topNChoice != null ? record.topNChoice : VIS_CONTROL_DEFAULTS.topNChoice
    });
  }

  function readEffectiveSettingsContext(_KDB, _widgetId, _payload, _visRecord) {
    var payload = _payload || {};
    var snapshot = payload.settingsSnapshot;
    if (snapshot && typeof snapshot === "object") {
      return copyOptionalVisOverrides(snapshot, {
        dimension: snapshot.dimension !== undefined ? snapshot.dimension : null,
        visType: snapshot.visType !== undefined ? snapshot.visType : null,
        topNChoice: snapshot.topNChoice !== undefined ? snapshot.topNChoice : null
      });
    }
    var fromSettingsApi = readFromWidgetSettingsPublicApi(_KDB, _widgetId);
    if (fromSettingsApi) {
      return fromSettingsApi;
    }
    return {
      dimension: null,
      visType: _visRecord && _visRecord.derived && _visRecord.derived.lastAppliedVisType
        ? _visRecord.derived.lastAppliedVisType
        : _resolveVisualizationBindingConfig.resolveDefaultVisualizationType(_KDB),
      topNChoice: null
    };
  }

  return readEffectiveSettingsContext;
});
