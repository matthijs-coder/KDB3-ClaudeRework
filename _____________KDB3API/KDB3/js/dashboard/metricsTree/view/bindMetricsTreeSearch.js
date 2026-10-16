define([
  "jquery"
], function ($) {
  "use strict";

  function __controller(_KDB) {
    const domRefs = _KDB.runtime.metricsTree.domRefs || {};
    const treesBySource = domRefs.treesBySource || {};
    const inputsBySource = domRefs.searchInputsBySource || {};
    const iconsBySource = domRefs.searchIconsBySource || {};
    const sourceKeys = Object.keys(treesBySource);

    for (let index = 0; index < sourceKeys.length; index += 1) {
      bindSourceSearch(treesBySource[sourceKeys[index]], inputsBySource[sourceKeys[index]], iconsBySource[sourceKeys[index]]);
    }
  }

  function bindSourceSearch(treeEl, inputEl, iconEl) {
    const $tree = $(treeEl);
    const $input = $(inputEl);
    const $icon = $(iconEl);

    $input.off(".kdbMetricsTreeSearch");
    $icon.off(".kdbMetricsTreeSearch");
    $input.on("input.kdbMetricsTreeSearch", createScheduledSearch($tree, $input));
    $input.on("keydown.kdbMetricsTreeSearch", createInputKeydownSearch($tree, $input));
    $icon.on("click.kdbMetricsTreeSearch", createRunSearch($tree, $input));
    $icon.on("keydown.kdbMetricsTreeSearch", createIconKeydownSearch($tree, $input));
  }

  function createScheduledSearch($tree, $input) {
    let frameId = 0;

    return function scheduleSearch() {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(function runFrameSearch() {
        frameId = 0;
        runSearch($tree, $input);
      });
    };
  }

  function createInputKeydownSearch($tree, $input) {
    return function onInputKeydown(event) {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      runSearch($tree, $input);
    };
  }

  function createIconKeydownSearch($tree, $input) {
    return function onIconKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      runSearch($tree, $input);
    };
  }

  function createRunSearch($tree, $input) {
    return function onSearch() {
      runSearch($tree, $input);
    };
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

  return __controller;
});
