define([
  "../../../../../core/config/visualizations/sorting.js",
  "./readVisualizationsConfig.js",
  "./resolveVisTypeIdentity.js"
], function (_visSorting, _readVisualizationsConfig, _resolveVisTypeIdentity) {
  "use strict";

  function readSortingByProfile(_KDB) {
    var visConfig = _readVisualizationsConfig(_KDB);
    return visConfig.sortingByProfile || _visSorting.sortingByProfile || {};
  }

  function resolveSortingProfileKey(_visualizationType, _KDB) {
    var bucket = _resolveVisTypeIdentity.resolveVisPropBucketKey(_visualizationType, _KDB);
    if (bucket === "Line") {
      return "line";
    }
    if (bucket === "List") {
      return "list";
    }
    if (bucket === "com.ibm.vis.custom.prognoseyearlinechart") {
      return "prognose";
    }
    return null;
  }

  function resolveSortingConfig(_visualizationType, _KDB, _tableConfig) {
    var tableConfig = _tableConfig || {};
    var visConfig = _readVisualizationsConfig(_KDB);
    var profileKey = resolveSortingProfileKey(_visualizationType, _KDB);
    var sortingByProfile = readSortingByProfile(_KDB);
    if (profileKey && sortingByProfile[profileKey]) {
      return sortingByProfile[profileKey];
    }
    return visConfig.sorting || tableConfig.sorting || {};
  }

  return resolveSortingConfig;
});
