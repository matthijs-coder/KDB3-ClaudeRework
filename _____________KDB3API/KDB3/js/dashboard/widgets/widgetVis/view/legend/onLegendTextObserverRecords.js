define([
  "./legendCaptionDom.js",
  "./sanitizeLegendCaptionSubtree.js",
  "./disconnectLegendTextObserver.js"
], function (
  _legendCaptionDom,
  _sanitizeLegendCaptionSubtree,
  _disconnectLegendTextObserver
) {
  "use strict";

  function pushUniqueScanRoot(_list, _node, _queryRoot) {
    try {
      if (!_node) {
        return;
      }
      var element = _node.nodeType === 1 ? _node : _node.parentElement;
      if (!element || element === _queryRoot) {
        return;
      }
      if (typeof element.querySelectorAll !== "function") {
        return;
      }
      for (var i = 0; i < _list.length; i += 1) {
        if (_list[i] === element) {
          return;
        }
      }
      _list.push(element);
    } catch (err) {
      console.error("[widgetVis.installLegendTextObserver] pushUniqueScanRoot failed", err);
    }
  }

  function collectObserverScanRoots(_mutation, _queryRoot) {
    try {
      var roots = [];
      var addedNodes = _mutation.addedNodes;
      if (addedNodes && addedNodes.length) {
        for (var i = 0; i < addedNodes.length; i += 1) {
          pushUniqueScanRoot(roots, addedNodes[i], _queryRoot);
        }
      }
      pushUniqueScanRoot(roots, _mutation.target, _queryRoot);
      return roots;
    } catch (err) {
      console.error("[widgetVis.installLegendTextObserver] collectObserverScanRoots failed", err);
      return [];
    }
  }

  function sanitizeObserverMutationFallbacks(_mutation, _queryRoot, _context) {
    try {
      var roots = collectObserverScanRoots(_mutation, _queryRoot);
      for (var r = 0; r < roots.length; r += 1) {
        _sanitizeLegendCaptionSubtree(roots[r], _context);
      }
    } catch (err) {
      console.error("[widgetVis.installLegendTextObserver] sanitizeObserverMutationFallbacks failed", err);
    }
  }

  function onLegendTextMutations(_mutations, _deps) {
    var deps = _deps || {};
    var runtime = deps.runtime;
    var widgetId = deps.widgetId;
    var opSeq = deps.opSeq;
    var isStaleOpSeq = deps.isStaleOpSeq;
    var queryRoot = deps.queryRoot;
    var context = deps.context;

    if (typeof isStaleOpSeq === "function" && isStaleOpSeq(widgetId, opSeq)) {
      _disconnectLegendTextObserver(runtime);
      return;
    }
    runtime._legendSanitizeActive = true;
    try {
      for (var m = 0; m < _mutations.length; m += 1) {
        var mutation = _mutations[m];
        if (!_legendCaptionDom.mutationNeedsLegendSanitize(mutation)) {
          continue;
        }
        if (_legendCaptionDom.sanitizeLegendCaptionMutation(mutation, context)) {
          continue;
        }
        sanitizeObserverMutationFallbacks(mutation, queryRoot, context);
      }
    } catch (err) {
      console.error("[widgetVis.installLegendTextObserver] onLegendTextMutations failed", err);
    } finally {
      runtime._legendSanitizeActive = false;
    }
  }

  function onLegendTextObserverRecords(_deps, _mutations) {
    var runtime = _deps.runtime;
    try {
      if (runtime._legendSanitizeActive) {
        return;
      }
      var shouldRun = false;
      for (var m = 0; m < _mutations.length; m += 1) {
        if (_legendCaptionDom.mutationNeedsLegendSanitize(_mutations[m])) {
          shouldRun = true;
          break;
        }
      }
      if (shouldRun) {
        onLegendTextMutations(_mutations, _deps);
      }
    } catch (err) {
      console.error("[widgetVis.installLegendTextObserver] onLegendTextObserverRecords failed", err);
    }
  }

  return onLegendTextObserverRecords;
});
