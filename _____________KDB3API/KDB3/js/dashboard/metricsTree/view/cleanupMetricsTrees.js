define([
  "jquery"
], function ($) {
  "use strict";

  function __controller(_KDB) {
    const runtime = readRuntime(_KDB);
    const domRefs = runtime.domRefs || {};
    const treeRefs = domRefs.treesBySource || {};
    const root = domRefs.root || resolveRoot(_KDB);

    Object.keys(treeRefs).forEach(function (sourceKey) {
      destroyTree(treeRefs[sourceKey]);
    });

    if (root) {
      $(root).find(".metricsTree").off(".kdbMetricsTreeSearch .kdbMetricsDnD");
      $(root).find(".kdb-metrics-tree__search-input").off(".kdbMetricsTreeSearch");
      $(root).find(".kdb-metrics-tree__search-icon").off(".kdbMetricsTreeSearch");
      root.innerHTML = "";
    }

    domRefs.root = root || null;
    domRefs.sourcesByKey = {};
    domRefs.treesBySource = {};
    domRefs.searchInputsBySource = {};
    domRefs.searchIconsBySource = {};
    runtime.pendingPromises = runtime.pendingPromises || {};
    delete runtime.pendingPromises.render;
  }

  function destroyTree(treeRef) {
    if (!treeRef) {
      return;
    }

    const $tree = $(treeRef);
    $tree.off(".kdbMetricsTreeSearch .kdbMetricsDnD .kdbReady");
    if ($tree.data("jstree")) {
      $tree.jstree("destroy");
    }
  }

  function resolveRoot(_KDB) {
    const selectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.metricsTree
      : null;
    if (!selectors || typeof document === "undefined") {
      return null;
    }

    return document.querySelector(selectors.rootSelector);
  }

  function readRuntime(_KDB) {
    if (!_KDB.runtime.metricsTree) {
      _KDB.runtime.metricsTree = {};
    }
    if (!_KDB.runtime.metricsTree.domRefs) {
      _KDB.runtime.metricsTree.domRefs = {};
    }
    return _KDB.runtime.metricsTree;
  }

  return __controller;
});
