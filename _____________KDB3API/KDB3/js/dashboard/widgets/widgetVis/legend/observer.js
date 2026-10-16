define([
  "../../../../core/utils/kit/runtime.js",
  "./captionDom.js",
  "./sanitize.js"
], function (_kitRuntime, _captionDom, _sanitize) {
  "use strict";

  var FRAME_TIMER_KEY = "legendTextFrame";

  function disconnectLegendTextObserver(_runtime) {
    if (!_runtime) {
      return { disconnected: false };
    }
    var observers = _runtime.observers || {};
    var observer = observers.legendText;
    var disconnected = false;
    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
      delete observers.legendText;
      disconnected = true;
    }
    _kitRuntime.clearTimer(_runtime.timers, FRAME_TIMER_KEY);
    _runtime.legendPendingRecords = [];
    return { disconnected: disconnected };
  }

  function pushScanRoot(_roots, _node, _queryRoot) {
    var element = _node && _node.nodeType === 1 ? _node : _node && _node.parentElement;
    if (element && element !== _queryRoot && typeof element.querySelectorAll === "function" && _roots.indexOf(element) === -1) {
      _roots.push(element);
    }
  }

  function sanitizeMutationFallback(_mutation, _queryRoot, _context) {
    var roots = [];
    var added = _mutation.addedNodes;
    var index;
    for (index = 0; added && index < added.length; index += 1) {
      pushScanRoot(roots, added[index], _queryRoot);
    }
    pushScanRoot(roots, _mutation.target, _queryRoot);
    roots.forEach(function (_root) {
      _sanitize.sanitizeLegendCaptionSubtree(_root, _context);
    });
  }

  function flushLegendRecords(_deps) {
    var runtime = _deps.runtime;
    var records = runtime.legendPendingRecords || [];
    runtime.legendPendingRecords = [];
    if (!records.length) {
      return;
    }
    if (typeof _deps.isStaleOpSeq === "function" && _deps.isStaleOpSeq(_deps.widgetId, _deps.opSeq)) {
      disconnectLegendTextObserver(runtime);
      return;
    }
    try {
      records.forEach(function (_record) {
        if (!_sanitize.sanitizeLegendCaptionMutation(_record, _deps.context)) {
          sanitizeMutationFallback(_record, _deps.queryRoot, _deps.context);
        }
      });
    } catch (err) {
      console.error("[widgetVis.flushLegendRecords] failed", _deps.widgetId, err);
    }
    // Our own writes queued records after the observer callback ran; drop them instead of sanitizing twice.
    _deps.observer.takeRecords();
  }

  function onLegendTextRecords(_deps, _records) {
    var runtime = _deps.runtime;
    try {
      var pending = runtime.legendPendingRecords || (runtime.legendPendingRecords = []);
      var before = pending.length;
      _records.forEach(function (_record) {
        if (_captionDom.mutationNeedsLegendSanitize(_record)) {
          pending.push(_record);
        }
      });
      if (pending.length > before) {
        runtime.timers = runtime.timers || {};
        _kitRuntime.scheduleFrame(runtime.timers, FRAME_TIMER_KEY, flushLegendRecords.bind(null, _deps));
      }
    } catch (err) {
      console.error("[widgetVis.onLegendTextRecords] failed", _deps.widgetId, err);
    }
  }

  function observeLegendRoot(_queryRoot, _deps) {
    var observer = new MutationObserver(onLegendTextRecords.bind(null, _deps));
    _deps.observer = observer;
    observer.observe(_queryRoot, {
      attributes: true,
      attributeFilter: ["id"],
      characterData: true,
      characterDataOldValue: true,
      childList: true,
      subtree: true
    });
    return observer;
  }

  function resolveSkipReason(_queryRoot, _context) {
    if (_context.mode === "cleanup") {
      return "cleanup";
    }
    if (!_context.runtime || !_queryRoot) {
      return _context.skipReason || "no_query_root";
    }
    if (typeof _context.isStaleOpSeq === "function" && _context.isStaleOpSeq(_context.widgetId, _context.opSeq)) {
      return "stale_op_seq";
    }
    return typeof MutationObserver === "function" ? null : "mutation_observer_unavailable";
  }

  function installLegendTextObserver(_queryRoot, _context) {
    var context = _context || {};
    var runtime = context.runtime;
    var widgetId = context.widgetId;
    var observeRoot = context.isShell === true ? "shell" : "queryRoot";
    var observerLog = {
      timestamp: Date.now(),
      widgetId: widgetId != null ? widgetId : null,
      opSeq: context.opSeq != null ? context.opSeq : null,
      observeRootSelector: observeRoot,
      observeRoot: observeRoot,
      storagePath: widgetId != null ? "_KDB.runtime.widgetVis.byId[" + widgetId + "].observers.legendText" : null,
      action: "skipped"
    };
    var skipReason = resolveSkipReason(_queryRoot, context);
    if (skipReason) {
      observerLog.reason = skipReason;
      return observerLog;
    }
    if (disconnectLegendTextObserver(runtime).disconnected) {
      observerLog.previousObserverDisconnected = true;
    }
    runtime.observers = runtime.observers || {};
    runtime.observers.legendText = observeLegendRoot(_queryRoot, {
      runtime: runtime,
      widgetId: widgetId,
      opSeq: context.opSeq,
      isStaleOpSeq: context.isStaleOpSeq,
      queryRoot: _queryRoot,
      context: context,
      observer: null
    });
    observerLog.action = "installed";
    return observerLog;
  }

  return {
    installLegendTextObserver: installLegendTextObserver,
    disconnectLegendTextObserver: disconnectLegendTextObserver
  };
});
