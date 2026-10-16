define([
  "./mapBwOrgPrompts.js",
  "./mapDezpvOrgPrompts.js",
  "./buildOrgTreeFromRows.js",
  "../config/hierarchyTableKeys.js"
], function (_mapBwOrgPrompts, _mapDezpvOrgPrompts, _buildOrgTreeFromRows, _hierarchyTableKeys) {
  "use strict";

  function normalizeSicht(_sicht) {
    return String(_sicht || "").toUpperCase().trim();
  }

  function hasSelection(_orgSelection) {
    return !!(!_orgSelection ? false : Array.isArray(_orgSelection.selectedValues) && _orgSelection.selectedValues.length);
  }

  function resolveTree(_spec, _sicht, _readRows) {
    var tableKey;
    var rows;
    if (_spec && _spec.orgTree && typeof _spec.orgTree === "object") {
      return _spec.orgTree;
    }
    tableKey = _sicht === "DEZPV" ? _hierarchyTableKeys.DEZPV : _hierarchyTableKeys.BW;
    if (typeof _readRows !== "function") {
      return null;
    }
    rows = _readRows([{ tableName: tableKey }]);
    if (!Array.isArray(rows) || !rows.length) {
      return null;
    }
    return _buildOrgTreeFromRows(rows, _sicht, tableKey);
  }

  function emptyOrg() {
    return {
      p_gruppe_drillFromGDB: "",
      p_dienststelle_drillFromGDB: "",
      p_dezpv_drillFromGDB: ""
    };
  }

  function __controller(_spec, _deps, _warnings) {
    try {
      var spec = _spec && typeof _spec === "object" ? _spec : {};
      var sicht = normalizeSicht(spec.sicht);
      var readRows = _deps && typeof _deps.readRows === "function" ? _deps.readRows : null;
      var tree;
      if (!sicht || !hasSelection(spec.orgSelection)) {
        return emptyOrg();
      }
      tree = resolveTree(spec, sicht, readRows);
      if (sicht === "BW") {
        return _mapBwOrgPrompts(spec.orgSelection, tree, _warnings);
      }
      if (sicht === "DEZPV") {
        return _mapDezpvOrgPrompts(spec.orgSelection, tree, _warnings);
      }
      return emptyOrg();
    } catch (err) {
      console.error("[drillthrough.mapOrgPrompts]", err);
      throw err;
    }
  }

  return __controller;
});
