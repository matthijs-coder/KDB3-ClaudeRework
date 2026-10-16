define(["./initializeRuntime.js"], function (_initializeRuntime) {
  function ensureWidgetRuntime(_KDB, _widgetId) {
    var runtimeRoot = _initializeRuntime(_KDB);
    runtimeRoot.byId = runtimeRoot.byId || {};
    if (!runtimeRoot.byId[_widgetId]) {
      runtimeRoot.byId[_widgetId] = createEmptyWidgetRuntime();
    }
    return runtimeRoot.byId[_widgetId];
  }

  function createEmptyWidgetRuntime() {
    return {
      domRefs: {
        shellEl: null,
        contentEl: null,
        editableEl: null,
        paragraphEl: null,
        spanEl: null,
        textNodeForFont: null
      },
      listeners: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      styleElements: {
        fontSize: null,
        textColor: null
      },
      opSeq: 0,
      editSession: {
        isActive: false,
        originalText: null,
        startedAt: null
      }
    };
  }

  return ensureWidgetRuntime;
});
