define([
  "jquery",
  "../../../core/libraries/jstree.min.js",
  "./cleanupMetricsTrees.js"
], function ($, _jstree, _cleanupMetricsTrees) {
  "use strict";

  function __controller(_KDB, _options) {
    const runtime = readRuntime(_KDB);
    const root = resolveRoot(_KDB, _options || {});
    const state = _KDB.state.metricsTree;
    const readyPromises = [];

    _cleanupMetricsTrees(_KDB);
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

      const domRefs = buildTreeDom(root, sourceEntry);
      registerDomRefs(runtime.domRefs, sourceKey, domRefs);
      initJsTree(domRefs.treeEl, sourceEntry.nodes);
      readyPromises.push(waitForTreeReady(domRefs.treeEl));
    }

    if (readyPromises.length === 0) {
      return Promise.resolve(false);
    }

    return Promise.all(readyPromises).then(resolveTrue);
  }

  function resolveRoot(_KDB, options) {
    if (options.rootEl) {
      return options.rootEl;
    }

    const selectors = _KDB.elements.selectors.metricsTree;
    const root = document.querySelector(selectors.rootSelector);
    return root || null;
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
    icon.innerHTML = getSearchIconSvg();
    tree.id = safeSourceKey + "Tree";
    tree.className = "metricsTree";

    searchContainer.appendChild(input);
    searchContainer.appendChild(icon);
    wrapper.appendChild(searchContainer);
    wrapper.appendChild(tree);
    root.appendChild(wrapper);

    return {
      wrapperEl: wrapper,
      inputEl: input,
      iconEl: icon,
      treeEl: tree
    };
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
    const $tree = $(treeEl);
    $tree.one("ready.jstree.kdbReady", deferred.resolve);
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

  function sanitizeForId(value) { return String(value || "").trim().replace(/[^A-Za-z0-9_-]+/g, "_"); }

  function getSearchIconSvg() {
    return '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0z" fill="none"></path><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16a6.471 6.471 0 004.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"></path></svg>';
  }

  function readRuntime(_KDB) { return _KDB.runtime.metricsTree; }
  function resolveTrue() { return true; }

  return __controller;
});
