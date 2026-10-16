define([], function () {
  "use strict";

  var SETTINGS_VIS_TYPE_ALIASES = {
    line: "Line",
    pie: "Pie",
    stackedbar: "StackedBar",
    stackedcolumn: "StackedColumn",
    list: "List",
    prognose: "Prognose",
    "com.ibm.vis.custom.prognoseyear": "Prognose",
    "com.ibm.vis.custom.prognoseyearlinechart": "Prognose"
  };

  function normalizeVisualizationType(_rawType) {
    if (_rawType == null || _rawType === "") {
      return null;
    }
    var text = String(_rawType).trim();
    var alias = SETTINGS_VIS_TYPE_ALIASES[text.toLowerCase()];
    return alias || text;
  }

  return normalizeVisualizationType;
});
