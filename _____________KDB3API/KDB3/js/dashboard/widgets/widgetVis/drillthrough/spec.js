define([
  "../runtime.js",
  "../selectors.js",
  "../settingsSnapshot.js",
  "./orgTree.js",
  "./year.js"
], function (_visRuntime, _selectors, _settingsSnapshot, _orgTree, _year) {
  "use strict";

  function readDefaultCalendarYear() {
    var now = new Date();
    var year = now.getFullYear();
    return now.getMonth() <= 1 ? year - 2 : year - 1;
  }

  function normalizeSicht(_sichtState) {
    var selection = _sichtState && _sichtState.currentSelection;
    if (!_sichtState || typeof _sichtState !== "object") {
      return "";
    }
    if (selection && selection.displayValue) {
      return String(selection.displayValue);
    }
    return _sichtState.activeSichtValue ? String(_sichtState.activeSichtValue) : "";
  }

  function mapOrgSelectionFromSnapshot(_snapshot) {
    var selectedValues = [];
    var resolution = _snapshot && _snapshot.resolution ? _snapshot.resolution : {};
    var useValues = Array.isArray(resolution.dominantValues) && resolution.dominantValues.length
      ? resolution.dominantValues
      : (Array.isArray(resolution.downstreamValues) ? resolution.downstreamValues : []);
    var displayValues = Array.isArray(resolution.displayValues) ? resolution.displayValues : [];
    var i, useValue, displayValue, tokenMatch, levelMatch, level;
    for (i = 0; i < useValues.length; i += 1) {
      useValue = String(useValues[i] == null ? "" : useValues[i]);
      displayValue = displayValues[i] != null ? String(displayValues[i]) : useValue;
      tokenMatch = useValue.match(/\[([^\]]+)\](?!.*\[[^\]]+\])/);
      levelMatch = useValue.match(/level0*(\d+)/i);
      level = levelMatch ? parseInt(levelMatch[1], 10) : NaN;
      selectedValues.push({
        useValue: useValue,
        displayValue: displayValue,
        idValue: tokenMatch ? String(tokenMatch[1] || "").trim() || displayValue : displayValue,
        level: isNaN(level) ? null : level
      });
    }
    return { selectedValues: selectedValues };
  }

  function readKennzahlCode(_record) {
    var derived = _record ? _record.derived : null;
    return derived && (derived.code || derived.kennzahlCode) ? (derived.code || derived.kennzahlCode) : "";
  }

  function readSicht(_sichtApi) {
    return normalizeSicht(_sichtApi && typeof _sichtApi.getState === "function" ? _sichtApi.getState() : null);
  }

  function readHierarchySnapshot(_dienststelleApi) {
    return _dienststelleApi && typeof _dienststelleApi.getCurrentHierarchySnapshot === "function"
      ? _dienststelleApi.getCurrentHierarchySnapshot()
      : null;
  }

  function readVisType(_KDB, _widgetId, _settings) {
    var visType = _settings && _settings.visType ? String(_settings.visType).toLowerCase() : "";
    var facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
    var outcome;
    if (!facet || typeof facet.getVisType !== "function") {
      return visType;
    }
    try {
      outcome = facet.getVisType(_widgetId);
    } catch (err) {
      console.error("[widgetVis.readVisType] getVisType failed", _widgetId, err);
      return visType;
    }
    if (outcome && typeof outcome.then !== "function" && outcome.ok === true
      && (typeof outcome.data === "string" || typeof outcome.data === "number")) {
      return String(outcome.data).toLowerCase();
    }
    return visType;
  }

  function assembleDrillthroughSpec(_options) {
    var options = _options || {};
    var _KDB = options._KDB;
    var widgetId = options.widgetId;
    var record = _selectors.readVisRecord(_KDB, widgetId);
    var settings = _settingsSnapshot.readEffectiveSettingsContext(_KDB, widgetId, {}, record);
    var sicht = readSicht(options.sichtApi);
    var snapshot = readHierarchySnapshot(options.dienststelleApi);
    var dimension = settings && settings.dimension != null ? String(settings.dimension) : "";
    var lowered = dimension.toLowerCase();
    var metricsTable = record && record.derived ? record.derived.metricsTable : null;
    return {
      source: "icon",
      widgetId: widgetId,
      visType: readVisType(_KDB, widgetId, settings),
      selectedDimension: !dimension || lowered === "none" || lowered === "default" ? null : dimension,
      kennzahlCode: readKennzahlCode(record),
      sicht: sicht,
      orgSelection: mapOrgSelectionFromSnapshot(snapshot),
      orgTree: _orgTree.buildOrgTree({ readRows: options.tableDataReadRows, sicht: sicht }),
      yearContext: {
        highestYearFromVis: _year.readDrillthroughVisYear(_KDB, widgetId),
        highestYearFromJahrFilter: _year.readDrillthroughJahrYear(_KDB, metricsTable),
        defaultYear: readDefaultCalendarYear()
      },
      hostEnv: null
    };
  }

  function assembleDatapointDrillthroughSpec(_options) {
    var options = _options || {};
    var categories = Array.isArray(options.categories) ? options.categories : null;
    var sicht;
    if (!categories || !categories.length) {
      return null;
    }
    sicht = readSicht(options.sichtApi);
    return {
      source: "datapoint",
      widgetId: options.widgetId,
      kennzahlCode: readKennzahlCode(_selectors.readVisRecord(options._KDB, options.widgetId)),
      sicht: sicht,
      orgSelection: mapOrgSelectionFromSnapshot(readHierarchySnapshot(options.dienststelleApi)),
      orgTree: _orgTree.buildOrgTree({ readRows: options.tableDataReadRows, sicht: sicht }),
      categories: categories,
      hostEnv: null
    };
  }

  return {
    assembleDrillthroughSpec: assembleDrillthroughSpec,
    assembleDatapointDrillthroughSpec: assembleDatapointDrillthroughSpec
  };
});
