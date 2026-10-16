define(["./buildOrgTreeForDrillthrough.js"], function (_buildOrgTreeForDrillthrough) {
  "use strict";

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

  function readKennzahlCode(_KDB, _widgetId) {
    var vis = _KDB && _KDB.state && _KDB.state.widgets ? _KDB.state.widgets.vis : null;
    var derived = vis && vis.byId && vis.byId[_widgetId] ? vis.byId[_widgetId].derived : null;
    return derived && (derived.code || derived.kennzahlCode) ? (derived.code || derived.kennzahlCode) : "";
  }

  function readCategories(_options) {
    return Array.isArray(_options.categories) ? _options.categories : null;
  }

  function __controller(_options) {
    try {
      var options = _options || {};
      var _KDB = options._KDB;
      var widgetId = options.widgetId;
      var categories = readCategories(options);
      var sichtApi = options.sichtApi;
      var dienststelleApi = options.dienststelleApi;
      var sicht;
      var snapshot;
      if (!categories || !categories.length) {
        return null;
      }
      sicht = normalizeSicht(sichtApi && typeof sichtApi.getState === "function" ? sichtApi.getState() : null);
      snapshot = dienststelleApi && typeof dienststelleApi.getCurrentHierarchySnapshot === "function"
        ? dienststelleApi.getCurrentHierarchySnapshot()
        : null;
      return {
        source: "datapoint",
        widgetId: widgetId,
        kennzahlCode: readKennzahlCode(_KDB, widgetId),
        sicht: sicht,
        orgSelection: mapOrgSelectionFromSnapshot(snapshot),
        orgTree: _buildOrgTreeForDrillthrough({ readRows: options.tableDataReadRows, sicht: sicht }),
        categories: categories,
        hostEnv: null
      };
    } catch (err) {
      console.error("[widgetVis.assembleDatapointDrillthroughSpec]", err);
      return null;
    }
  }

  return __controller;
});
