define([
  "./populateStaticDropdown.js",
  "./populateTableDropdown.js"
], function (_populateStaticDropdown, _populateTableDropdown) {
  function __controller(_KDB, _context) {
    try {
      const widgetType = _context.widgetType === "text" ? "text" : "live";
      _populateStaticDropdown(_KDB, _context.root, "backgroundColor", ".KDB_backgroundColorContainer", true);
      if (widgetType === "live") {
        _populateStaticDropdown(_KDB, _context.root, "visualization", ".KDB_visualizationsContainer", false);
        _populateStaticDropdown(_KDB, _context.root, "grouping", ".KDB_groupingContainer", false);
        _populateStaticDropdown(_KDB, _context.root, "showValues", ".KDB_showValuesContainer", false);
        _populateStaticDropdown(_KDB, _context.root, "iterator", ".KDB_showValuesContainer > .KDB_IconsDropdown[data-kdb-dropdown-kind=\"iterator\"]", false);
        _populateStaticDropdown(_KDB, _context.root, "zoom", ".KDB_showValuesContainer > .KDB_IconsDropdown[data-kdb-dropdown-kind=\"zoom\"]", false);
        _populateStaticDropdown(_KDB, _context.root, "valueCaption", ".KDB_showValuesContainer > .KDB_IconsDropdown[data-kdb-dropdown-kind=\"valueCaption\"]", false);
        _populateTableDropdown(_KDB, _context, "dimension", ".KDB_dimensionsContainer", "dimensions");
        _populateStaticDropdown(_KDB, _context.root, "topN", ".KDB_topNContainer", false);
        _populateStaticDropdown(_KDB, _context.root, "move", ".KDB_moveContainer", false);
      }
      if (widgetType === "text") {
        _populateStaticDropdown(_KDB, _context.root, "restyle", ".KDB_layoutContainer", false, "layout");
        _populateStaticDropdown(_KDB, _context.root, "move", ".KDB_moveContainer", false);
        _populateStaticDropdown(_KDB, _context.root, "fontSize", ".KDB_fontSizeContainer", false);
      }
    } catch (err) {
      console.error("[widgetSettings.buildDropdownOptions] failed", { widgetId: _context && _context.widgetId }, err);
      throw err;
    }
  }

  return __controller;
});
