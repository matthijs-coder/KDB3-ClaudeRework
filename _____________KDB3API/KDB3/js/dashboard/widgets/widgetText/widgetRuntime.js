define(["../../../core/utils/kit/runtime.js"], function (_rt) {
  "use strict";

  function createIdleEditSession() {
    return { isActive: false, originalText: null, startedAt: null };
  }

  function createWidgetRuntime() {
    return _rt.ensureRuntimeBuckets({
      styleElements: { fontSize: null, textColor: null },
      opSeq: 0,
      editSession: createIdleEditSession()
    });
  }

  function readRuntimeRoot(_KDB) {
    return _rt.ensureRuntime(_KDB, "widgetText", { byId: {} });
  }

  function ensureWidgetRuntime(_KDB, _widgetId) {
    var root = readRuntimeRoot(_KDB);
    if (!root.byId[_widgetId]) {
      root.byId[_widgetId] = createWidgetRuntime();
    }
    return root.byId[_widgetId];
  }

  function ensureOpSeq(_KDB, _widgetId, _requestedOpSeq) {
    var runtime = ensureWidgetRuntime(_KDB, _widgetId);
    if (typeof _requestedOpSeq === "number") {
      runtime.opSeq = _requestedOpSeq;
      return _requestedOpSeq;
    }
    runtime.opSeq = (runtime.opSeq || 0) + 1;
    return runtime.opSeq;
  }

  function isStaleOpSeq(_KDB, _widgetId, _opSeq) {
    var runtime = readRuntimeRoot(_KDB).byId[_widgetId];
    if (!runtime || typeof _opSeq !== "number") {
      return false;
    }
    return runtime.opSeq !== _opSeq;
  }

  function storeDomRefs(_KDB, _widgetId, _nodes) {
    ensureWidgetRuntime(_KDB, _widgetId).domRefs = {
      shellEl: _nodes.shellEl,
      contentEl: _nodes.contentEl,
      editableEl: _nodes.editableEl,
      paragraphEl: _nodes.paragraphEl,
      spanEl: _nodes.spanEl,
      textNodeForFont: _nodes.textNodeForFont
    };
  }

  return {
    createIdleEditSession: createIdleEditSession,
    readRuntimeRoot: readRuntimeRoot,
    ensureWidgetRuntime: ensureWidgetRuntime,
    ensureOpSeq: ensureOpSeq,
    isStaleOpSeq: isStaleOpSeq,
    storeDomRefs: storeDomRefs
  };
});
