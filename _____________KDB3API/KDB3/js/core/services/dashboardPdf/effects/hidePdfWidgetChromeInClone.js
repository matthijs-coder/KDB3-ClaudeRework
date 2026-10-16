define([], function () {
  "use strict";

  function hideNode(_node) {
    try {
      if (_node && _node.style) {
        _node.style.display = "none";
      }
    } catch (err) {
      console.error("[dashboardPdf.hideNode] failed", err);
    }
  }

  function hideAll(_root, _selector) {
    try {
      var nodes;
      var i;
      if (!_root || typeof _root.querySelectorAll !== "function") return;
      nodes = _root.querySelectorAll(_selector);
      for (i = 0; i < nodes.length; i += 1) {
        hideNode(nodes[i]);
      }
    } catch (err) {
      console.error("[dashboardPdf.hideAll] failed", err);
    }
  }

  function hideHeaderPkzWrappers(_root) {
    try {
      var nodes;
      var i;
      var node;
      if (!_root || typeof _root.querySelectorAll !== "function") return;
      nodes = _root.querySelectorAll(".widgetHeader .dataWidgetIcon");
      for (i = 0; i < nodes.length; i += 1) {
        node = nodes[i];
        if (node && typeof node.querySelector === "function" && node.querySelector(".kdb_hyperlink_icon")) {
          hideNode(node);
        }
      }
    } catch (err) {
      console.error("[dashboardPdf.hideHeaderPkzWrappers] failed", err);
    }
  }

  function hidePdfWidgetChromeInClone(_clonedElement) {
    try {
      if (!_clonedElement || typeof _clonedElement.querySelectorAll !== "function") return;
      hideAll(_clonedElement, ".kdb-widget-maximize");
      hideAll(_clonedElement, ".kdb-datapoint-pkz");
      hideHeaderPkzWrappers(_clonedElement);
    } catch (err) {
      console.error("[dashboardPdf.hidePdfWidgetChromeInClone] failed", err);
    }
  }

  return hidePdfWidgetChromeInClone;
});
