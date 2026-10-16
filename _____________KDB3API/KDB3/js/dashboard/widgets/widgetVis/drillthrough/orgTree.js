define([
  "../../../../core/utils/orgTree/buildOrgTree.js",
  "../../../../core/utils/orgTree/hierarchyCell.js"
], function (_orgTree, _hierarchyCell) {
  "use strict";

  // Hierarchy tree for the drillthrough spec; null when the rows are not cached yet or the read fails.
  function buildOrgTree(_options) {
    try {
      return _orgTree.readOrgTree(_options);
    } catch (err) {
      console.error("[widgetVis.buildOrgTree]", err);
      return null;
    }
  }

  return {
    buildOrgTree: buildOrgTree,
    parseHierarchyCell: _hierarchyCell.parseHierarchyCell
  };
});
