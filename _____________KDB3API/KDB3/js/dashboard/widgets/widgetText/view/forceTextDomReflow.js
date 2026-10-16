define(["./resolveTextEditableNodes.js", "../config/defaults.js"], function (_resolveTextEditableNodes, _defaults) {
  function __controller(_KDB, _widgetId, _nodes, _shellEl) {
    try {
      var nodes = _nodes && _nodes.editableEl ? _nodes : _resolveTextEditableNodes(_KDB, _widgetId, _shellEl);
      var editableEl = nodes && nodes.editableEl ? nodes.editableEl : null;
      if (!editableEl) {
        return { ok: false, errorCode: "WIDGET_TEXT_REFLOW_TARGET_MISSING" };
      }
      if (editableEl.classList) {
        editableEl.classList.add(_defaults.textFittedClass);
      }
      forceLayout(editableEl);
      dispatchWindowResize();
      return { ok: true, target: "editable" };
    } catch (err) {
      console.error("[widgetText.forceTextDomReflow] failed", { widgetId: _widgetId }, err);
      return { ok: false, errorCode: "WIDGET_TEXT_REFLOW_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function forceLayout(_editableEl) {
    var previousDisplay = _editableEl.style.display;
    _editableEl.style.display = "none";
    readLayout(_editableEl);
    _editableEl.style.display = previousDisplay;
    readLayout(_editableEl);
  }

  function readLayout(_element) {
    return _element.offsetHeight;
  }

  function dispatchWindowResize() {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new Event("resize"));
    }
  }

  return __controller;
});
