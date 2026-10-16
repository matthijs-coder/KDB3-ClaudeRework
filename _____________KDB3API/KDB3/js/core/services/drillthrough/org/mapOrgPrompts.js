define([
  "./mapBwOrgPrompts.js",
  "./mapDezpvOrgPrompts.js",
  "../../../utils/orgTree/buildOrgTree.js",
  "../../../utils/orgTree/hierarchyTable.js"
], function (_mapBwOrgPrompts, _mapDezpvOrgPrompts, _orgTree, _hierarchyTable) {
  "use strict";

  function hasSelection(_orgSelection) {
    return !!(!_orgSelection ? false : Array.isArray(_orgSelection.selectedValues) && _orgSelection.selectedValues.length);
  }

  function resolveTree(_spec, _sicht, _readRows) {
    if (_spec && _spec.orgTree && typeof _spec.orgTree === "object") {
      return _spec.orgTree;
    }
    return _orgTree.readOrgTree({ readRows: _readRows, sicht: _sicht });
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
      var sicht = _hierarchyTable.normalizeSicht(spec.sicht);
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
