define([
  "./config.js",
  "./runtime.js",
  "../../../core/utils/kit/runtime.js"
], function (_config, _visRuntime, _kitRuntime) {
  "use strict";

  var CLASS = _config.lineTooltipHideClass;
  var HOLD_MS = _config.lineTooltipHoldMs;
  var LINE_WIDGET = _config.lineTooltipWidgetSelector;
  var LEGEND_SEL = _config.lineTooltipLegendSelector;
  var CHART_SEL = _config.lineTooltipChartSelector;
  var POINT_SEL = _config.lineTooltipPointSelector;
  var LABELS_SEL = _config.lineTooltipLabelsSelector;
  var VALUE_SEL = _config.lineTooltipLabelValueSelector;
  var OBSERVE_OPTS = { childList: true, characterData: true, subtree: true };

  function emptyState() {
    return { pendingPoint: false, previousTooltip: null };
  }

  function tooltipText() {
    var labels = Array.prototype.slice.call(document.querySelectorAll(LABELS_SEL)).filter(function (el) {
      return el.getClientRects().length && el.querySelector(VALUE_SEL);
    });
    var last = labels[labels.length - 1];
    return last ? last.textContent.replace(/\s+/g, " ").trim() : null;
  }

  function bodyClassList() {
    return typeof document !== "undefined" && document.body && document.body.classList ? document.body.classList : null;
  }

  function hasHideClass() {
    var list = bodyClassList();
    return !!(list && list.contains(CLASS));
  }

  function addHideClass() {
    var list = bodyClassList();
    if (list) {
      list.add(CLASS);
    }
  }

  // Class is on body because the tooltip DOM can sit outside the widget.
  // Limitation: one global class for all widgets.
  function removeHideClass() {
    var list = bodyClassList();
    if (list) {
      list.remove(CLASS);
    }
  }

  function cancelPending(rt) {
    var state = rt.lineTooltip;
    var observer;
    if (!state || !state.pendingPoint) {
      return;
    }
    state.pendingPoint = false;
    observer = rt.observers && rt.observers.lineTooltip;
    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
    }
  }

  // 800 ms hold bridges Cognos tooltip lifecycle gaps at hover boundaries; CSS :hover cannot.
  function startHoldIfIdle(_KDB, rt) {
    if (!hasHideClass() || rt.timers.lineTooltipHold) {
      return;
    }
    _kitRuntime.scheduleTimeout(rt.timers, "lineTooltipHold", function () {
      onHoldElapsed(_KDB, rt);
    }, HOLD_MS);
  }

  function onHoldElapsed(_KDB, rt) {
    try {
      _kitRuntime.clearTimer(rt.timers, "lineTooltipHold");
      if (_KDB.runtime.widgetVis !== rt) {
        return;
      }
      removeHideClass();
    } catch (err) {
      console.error("[widgetVis.lineTooltip] hold timer failed", err);
    }
  }

  // Keep the aggregate hidden on line->point until Cognos replaces tooltip content, else the old aggregate flashes.
  function observeBody(rt) {
    var observer = rt.observers && rt.observers.lineTooltip;
    if (!observer || typeof observer.observe !== "function" || !document.body) {
      return;
    }
    observer.observe(document.body, OBSERVE_OPTS);
  }

  function isLineWidgetFrom(el) {
    var widget = el.closest(".widget");
    return !!(widget && widget.querySelector(LINE_WIDGET));
  }

  function beginPointHold(rt) {
    var state = rt.lineTooltip;
    if (!hasHideClass() || !state || state.pendingPoint) {
      return;
    }
    state.previousTooltip = tooltipText();
    state.pendingPoint = true;
    observeBody(rt);
  }

  function applyPointer(el, _KDB, rt) {
    var onLegend = !!el.closest(LEGEND_SEL);
    var onChart = !!el.closest(CHART_SEL);
    var onPoint = !!el.closest(POINT_SEL);
    var line;
    if (!onLegend && !onChart && !onPoint) {
      cancelPending(rt);
      startHoldIfIdle(_KDB, rt);
      return;
    }
    line = isLineWidgetFrom(el);
    if (line && onPoint) {
      _kitRuntime.clearTimer(rt.timers, "lineTooltipHold");
      beginPointHold(rt);
      return;
    }
    cancelPending(rt);
    if (line && (onLegend || onChart)) {
      _kitRuntime.clearTimer(rt.timers, "lineTooltipHold");
      addHideClass();
      return;
    }
    startHoldIfIdle(_KDB, rt);
  }

  function onPointer(_KDB, rt, event) {
    try {
      var el;
      if (_KDB.runtime.widgetVis !== rt || !rt.lineTooltip) {
        return;
      }
      el = event && event.target;
      // Prefer instanceof Element (tests stub the ctor); duck-type closest when it is missing.
      if (typeof Element === "function" ? !(el instanceof Element) : !el || typeof el.closest !== "function") {
        return;
      }
      applyPointer(el, _KDB, rt);
    } catch (err) {
      console.error("[widgetVis.lineTooltip] pointer handler failed", err);
    }
  }

  function onTooltipMutation(_KDB, rt) {
    try {
      var state;
      var current;
      var observer;
      if (_KDB.runtime.widgetVis !== rt) {
        return;
      }
      state = rt.lineTooltip;
      if (!state || !state.pendingPoint) {
        return;
      }
      current = tooltipText();
      if (current && current !== state.previousTooltip) {
        state.pendingPoint = false;
        observer = rt.observers.lineTooltip;
        if (observer && typeof observer.disconnect === "function") {
          observer.disconnect();
        }
        removeHideClass();
      }
    } catch (err) {
      console.error("[widgetVis.lineTooltip] observer callback failed", err);
    }
  }

  function bindPointer(_KDB, rt) {
    function pointerHandler(event) {
      onPointer(_KDB, rt, event);
    }
    _kitRuntime.addListener(rt.listeners, "lineTooltipOver", document, "pointerover", pointerHandler, true);
    _kitRuntime.addListener(rt.listeners, "lineTooltipMove", document, "pointermove", pointerHandler, true);
  }

  function releasePointerListeners(rt) {
    ["lineTooltipOver", "lineTooltipMove"].forEach(function (key) {
      var entry = rt.listeners && rt.listeners[key];
      var target = entry && entry.target;
      if (target && typeof target.removeEventListener === "function" && typeof entry.handler === "function") {
        target.removeEventListener(entry.type, entry.handler, entry.options);
      }
      if (rt.listeners) {
        delete rt.listeners[key];
      }
    });
  }

  function install(_KDB) {
    var rt;
    if (!_KDB) {
      return;
    }
    rt = _visRuntime.initializeRuntime(_KDB);
    if (rt.listeners.lineTooltipOver) {
      return;
    }
    if (typeof document === "undefined" || !document.body) {
      return;
    }
    rt.lineTooltip = emptyState();
    if (typeof MutationObserver === "function") {
      rt.observers.lineTooltip = new MutationObserver(function () {
        onTooltipMutation(_KDB, rt);
      });
    }
    bindPointer(_KDB, rt);
  }

  function uninstall(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    var observer;
    if (!rt) {
      return;
    }
    cancelPending(rt);
    observer = rt.observers && rt.observers.lineTooltip;
    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
    }
    if (rt.timers) {
      _kitRuntime.clearTimer(rt.timers, "lineTooltipHold");
    }
    removeHideClass();
    releasePointerListeners(rt);
    rt.lineTooltip = null;
  }

  return { install: install, uninstall: uninstall };
});
