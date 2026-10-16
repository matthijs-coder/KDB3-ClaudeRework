define([
  "jquery",
  "../../core/libraries/jstree.min.js",
  "../../core/utils/kit/runtime.js",
  "./config.js"
], function ($, _jstree, _runtimeKit, _config) {
  "use strict";

  function renderMetricsTrees(_KDB) {
    const runtime = _KDB.runtime.metricsTree;
    const root = resolveRoot(_KDB);
    const state = _KDB.state.metricsTree;
    const readyPromises = [];

    cleanupMetricsTrees(_KDB);
    runtime.domRefs.root = root;
    if (!root || !state || !state.hasRenderableData || !Array.isArray(state.sourceOrder)) {
      return Promise.resolve(false);
    }

    for (let index = 0; index < state.sourceOrder.length; index += 1) {
      const sourceKey = state.sourceOrder[index];
      const sourceEntry = state.bySource[sourceKey];
      if (!sourceEntry || !Array.isArray(sourceEntry.nodes) || sourceEntry.nodes.length === 0) {
        continue;
      }

      const refs = buildTreeDom(root, sourceEntry);
      registerDomRefs(runtime.domRefs, sourceKey, refs);
      initJsTree(refs.treeEl, sourceEntry.nodes);
      readyPromises.push(waitForTreeReady(refs.treeEl));
    }

    if (readyPromises.length === 0) {
      return Promise.resolve(false);
    }

    return Promise.all(readyPromises).then(function () { return true; });
  }

  function resolveRoot(_KDB) {
    const selectors = _KDB.elements.selectors.metricsTree;
    return document.querySelector(selectors.rootSelector) || null;
  }

  function buildTreeDom(root, sourceEntry) {
    const safeSourceKey = sanitizeForId(sourceEntry.sourceKey);
    const wrapper = document.createElement("div");
    const searchContainer = document.createElement("div");
    const input = document.createElement("input");
    const icon = document.createElement("span");
    const tree = document.createElement("div");

    wrapper.id = "kdb-control_metrics_" + safeSourceKey + "_container";
    wrapper.className = "kdb-metrics-tree__source";
    searchContainer.className = "searchContainer";
    input.id = safeSourceKey + "_treeSearch";
    input.className = "treeSearch kdb-metrics-tree__search-input";
    input.type = "search";
    icon.id = safeSourceKey + "_searchIcon";
    icon.className = "searchIcon kdb-metrics-tree__search-icon";
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.innerHTML = _config.SEARCH_ICON_SVG;
    tree.id = safeSourceKey + "Tree";
    tree.className = "metricsTree";

    searchContainer.appendChild(input);
    searchContainer.appendChild(icon);
    wrapper.appendChild(searchContainer);
    wrapper.appendChild(tree);
    root.appendChild(wrapper);

    return { wrapperEl: wrapper, inputEl: input, iconEl: icon, treeEl: tree };
  }

  function initJsTree(treeEl, nodes) {
    const $tree = $(treeEl);
    if (!($.fn && $.fn.jstree)) {
      throw new Error("jsTree plugin is not loaded on jQuery");
    }

    $tree.jstree({
      plugins: ["search"],
      core: {
        animation: 100,
        data: nodes,
        check_callback: true,
        force_text: true,
        themes: {
          stripes: false,
          icons: false,
          dots: false
        },
        worker: true
      },
      search: {
        case_sensitive: false,
        show_only_matches: true,
        show_only_matches_children: true,
        search_callback: searchNode
      }
    });
  }

  function searchNode(term, node) {
    const query = String(term || "").toLowerCase().trim();
    const text = String(node.text || "").toLowerCase();
    const langtext = String((node.a_attr && (node.a_attr.langtext || node.a_attr.title)) || "").toLowerCase();
    return !query || text.indexOf(query) > -1 || langtext.indexOf(query) > -1;
  }

  function waitForTreeReady(treeEl) {
    const deferred = $.Deferred();
    $(treeEl).one("ready.jstree.kdbReady", deferred.resolve);
    return deferred.promise();
  }

  function registerDomRefs(domRefs, sourceKey, refs) {
    domRefs.sourcesByKey = domRefs.sourcesByKey || {};
    domRefs.treesBySource = domRefs.treesBySource || {};
    domRefs.searchInputsBySource = domRefs.searchInputsBySource || {};
    domRefs.searchIconsBySource = domRefs.searchIconsBySource || {};
    domRefs.sourcesByKey[sourceKey] = refs.wrapperEl;
    domRefs.treesBySource[sourceKey] = refs.treeEl;
    domRefs.searchInputsBySource[sourceKey] = refs.inputEl;
    domRefs.searchIconsBySource[sourceKey] = refs.iconEl;
  }

  function sanitizeForId(value) {
    return String(value || "").trim().replace(/[^A-Za-z0-9_-]+/g, "_");
  }

  function cleanupMetricsTrees(_KDB) {
    const domRefs = _KDB.runtime.metricsTree.domRefs;
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

  function bindMetricsTreeSearch(_KDB) {
    const runtime = _KDB.runtime.metricsTree;
    const treesBySource = runtime.domRefs.treesBySource || {};
    const inputsBySource = runtime.domRefs.searchInputsBySource || {};
    const iconsBySource = runtime.domRefs.searchIconsBySource || {};

    Object.keys(treesBySource).forEach(function (sourceKey) {
      bindSourceSearch(runtime, sourceKey, $(treesBySource[sourceKey]), $(inputsBySource[sourceKey]), $(iconsBySource[sourceKey]));
    });
  }

  function bindSourceSearch(runtime, sourceKey, $tree, $input, $icon) {
    const timerKey = "search:" + sourceKey;
    const run = function () { runSearch($tree, $input); };

    $input.off(".kdbMetricsTreeSearch");
    $icon.off(".kdbMetricsTreeSearch");
    _runtimeKit.clearTimer(runtime.timers, timerKey);

    $input.on("input.kdbMetricsTreeSearch", function () {
      _runtimeKit.scheduleFrame(runtime.timers, timerKey, run);
    });
    $input.on("keydown.kdbMetricsTreeSearch", function (event) {
      if (event.key !== "Enter") { return; }
      event.preventDefault();
      run();
    });
    $icon.on("click.kdbMetricsTreeSearch", run);
    $icon.on("keydown.kdbMetricsTreeSearch", function (event) {
      if (event.key !== "Enter" && event.key !== " ") { return; }
      event.preventDefault();
      run();
    });
  }

  function runSearch($tree, $input) {
    const instance = $tree.jstree(true);
    const value = String($input.val() || "").trim();

    if (!instance) {
      return;
    }

    if (!value) {
      instance.clear_search();
      return;
    }

    instance.search(value);
  }

  return {
    renderMetricsTrees: renderMetricsTrees,
    cleanupMetricsTrees: cleanupMetricsTrees,
    bindMetricsTreeSearch: bindMetricsTreeSearch
  };
});
