define(["jquery"], function ($) {
  "use strict";

  function bindMetricsTreeDragSources(_KDB) {
    const state = _KDB.state.metricsTree;
    const treesBySource = _KDB.runtime.metricsTree.domRefs.treesBySource || {};
    const dragDrop = _KDB.api.dragDrop;

    if (!state || !Array.isArray(state.sourceOrder)) {
      return;
    }

    if (!dragDrop) {
      console.warn("[metricsTree.dragSource] drag/drop API unavailable; drag is disabled");
      return;
    }

    dragDrop.refreshDropboxes();
    for (let index = 0; index < state.sourceOrder.length; index += 1) {
      bindTree($(treesBySource[state.sourceOrder[index]]), dragDrop);
    }
  }

  function bindTree($tree, dragDrop) {
    if ($tree.length === 0) {
      return;
    }

    $tree.off(".kdbMetricsDnD");
    $tree.on("dragstart.kdbMetricsDnD", ".jstree-anchor", function (event) {
      onDragStart(dragDrop, this, event);
    });
    $tree.on("dragend.kdbMetricsDnD", ".jstree-anchor", function (event) {
      onDragEnd(dragDrop, event);
    });
  }

  function onDragStart(dragDrop, anchorEl, event) {
    try {
      const originalEvent = event.originalEvent || event;
      const $anchor = $(anchorEl);

      if (!$anchor.closest(".jstree-node").hasClass("jstree-leaf")) {
        originalEvent.preventDefault();
        return;
      }

      if (!originalEvent.dataTransfer) {
        return;
      }

      originalEvent.dataTransfer.setData("text/plain", "");
      dragDrop.startDrag(originalEvent, {
        dragSourceEl: $anchor[0],
        draggedElementType: readDraggedElementType($anchor),
        originId: $anchor.attr("id") || null,
        payload: buildDragPayload($anchor),
        sourceKind: "metricsTreeLeaf"
      });
    } catch (err) {
      console.error("[metricsTree.dragSource] dragstart failed", err);
    }
  }

  function onDragEnd(dragDrop, event) {
    try {
      dragDrop.finishDrag(event.originalEvent || event);
    } catch (err) {
      console.error("[metricsTree.dragSource] dragend failed", err);
    }
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

  return { bindMetricsTreeDragSources: bindMetricsTreeDragSources };
});
