define([
  "jquery"
], function ($) {
  "use strict";

  function __controller(_KDB, _dragDropAdapter) {
    const state = _KDB.state.metricsTree;
    const domRefs = _KDB.runtime.metricsTree.domRefs || {};
    const treesBySource = domRefs.treesBySource || {};

    if (!state || !Array.isArray(state.sourceOrder)) {
      return;
    }

    _dragDropAdapter.refreshDropboxes();
    for (let index = 0; index < state.sourceOrder.length; index += 1) {
      bindTreeBySource(treesBySource[state.sourceOrder[index]], _dragDropAdapter);
    }
  }

  function bindTreeBySource(treeEl, dragDropAdapter) {
    const $tree = $(treeEl);
    if ($tree.length === 0) {
      return;
    }

    syncDraggables($tree);
    $tree.off(".kdbMetricsDnD");
    $tree.on(
      "ready.jstree.kdbMetricsDnD open_node.jstree.kdbMetricsDnD refresh.jstree.kdbMetricsDnD search_complete.jstree.kdbMetricsDnD clear_search.jstree.kdbMetricsDnD",
      createSyncDraggables($tree)
    );
    $tree.on("dragstart.kdbMetricsDnD", ".jstree-anchor", createStartDrag(dragDropAdapter));
    $tree.on("dragend.kdbMetricsDnD", ".jstree-anchor", createFinishDrag($tree, dragDropAdapter));
  }

  function createSyncDraggables($tree) {
    return function onTreeChanged() {
      syncDraggables($tree);
    };
  }

  function createStartDrag(dragDropAdapter) {
    return function onDragStart(event) {
      const originalEvent = event.originalEvent || event;
      const $anchor = $(this);
      const $node = $anchor.closest(".jstree-node");

      if (!$node.hasClass("jstree-leaf")) {
        preventEvent(originalEvent);
        return;
      }

      if (!originalEvent.dataTransfer) {
        return;
      }

      originalEvent.dataTransfer.setData("text/plain", "");
      dragDropAdapter.startDrag(originalEvent, {
        dragSourceEl: $anchor[0],
        draggedElementType: readDraggedElementType($anchor),
        originId: $anchor.attr("id") || null,
        payload: buildDragPayload($anchor),
        sourceKind: "metricsTreeLeaf"
      });
    };
  }

  function createFinishDrag($tree, dragDropAdapter) {
    return function onDragEnd(event) {
      syncDraggables($tree);
      dragDropAdapter.finishDrag(event.originalEvent || event);
    };
  }

  function syncDraggables($tree) {
    $tree.find(".jstree-node").each(markNodeDraggable);
  }

  function markNodeDraggable() {
    const $node = $(this);
    const $anchor = $node.children(".jstree-anchor");
    $anchor.attr("draggable", $node.hasClass("jstree-leaf") ? "true" : "false");
  }

  function buildDragPayload($anchor) {
    return {
      code: $anchor.attr("code") || "",
      display: $anchor.attr("display") || $anchor.text() || "",
      title: $anchor.attr("title") || "",
      langtext: $anchor.attr("langtext") || $anchor.attr("title") || "",
      metricsTable: $anchor.attr("metricstable") || "",
      originId: $anchor.attr("id") || null,
      draggedElementType: readDraggedElementType($anchor),
      url: $anchor.attr("data-url") || ""
    };
  }

  function readDraggedElementType($anchor) {
    return $anchor.attr("draggedelementtype") || $anchor.attr("draggtype") || "visualization";
  }

  function preventEvent(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  }

  return __controller;
});
