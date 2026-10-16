define(["./initializeRuntime.js"], function (_initializeRuntime) {
  "use strict";

  function createDefaultFocusModeBucket() {
    return {
      observedExpanded: false,
      observer: null,
      focusPanelEl: null,
      dispose: null,
      source: null
    };
  }

  function ensureWidgetRuntime(_KDB, _widgetId) {
    var runtimeRoot = _initializeRuntime(_KDB);
    runtimeRoot.byId = runtimeRoot.byId || {};
    if (!runtimeRoot.byId[_widgetId]) {
      runtimeRoot.byId[_widgetId] = createEmptyWidgetRuntime();
    } else if (!runtimeRoot.byId[_widgetId].focusMode) {
      runtimeRoot.byId[_widgetId].focusMode = createDefaultFocusModeBucket();
    }
    return runtimeRoot.byId[_widgetId];
  }

  function createEmptyWidgetRuntime() {
    return {
      domRefs: {
        contentEl: null,
        headerEl: null,
        titleLinkEl: null,
        drillthroughIconEl: null,
        datapointDrillthroughIconEl: null,
        canvasMaximizeIconEl: null
      },
      listeners: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      opSeq: 0,
      lastSuccessfulPlan: null,
      lastAppliedVisPropertiesType: null,
      managedFilterItemIds: [],
      drillthrough: {
        installed: false,
        lastSelectionEvent: null,
        pendingSelectionEvents: [],
        captureActive: false
      },
      focusMode: createDefaultFocusModeBucket()
    };
  }

  return ensureWidgetRuntime;
});
