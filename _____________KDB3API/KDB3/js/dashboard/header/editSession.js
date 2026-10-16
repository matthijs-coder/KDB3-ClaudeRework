define(["./state.js", "../../core/utils/kit/runtime.js"], function (_state, _rt) {
  "use strict";

  function endEditSession(_KDB) {
    var rt = _KDB.runtime.header;
    var controller = rt.abortControllers.editSession;
    if (controller) controller.abort();
    delete rt.abortControllers.editSession;
    rt.currentEditTarget = null;
  }

  function placeCursorAtEnd(_node) {
    var selection = window.getSelection && window.getSelection();
    if (!_node || !selection) return;
    var range = document.createRange();
    range.selectNodeContents(_node);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function focusEditNode(_KDB, _target, _node) {
    if (_state.readActiveEditTarget(_KDB.state.header) !== _target || !_node.isConnected) return;
    _node.focus();
    placeCursorAtEnd(_node);
  }

  function scheduleFocus(_KDB, _target, _node) {
    var run = focusEditNode.bind(null, _KDB, _target, _node);
    run();
    _rt.scheduleFrame(_KDB.runtime.header.timers, "editFocus", run);
  }

  function commitCurrentEdit(_KDB, _target) {
    var api = _KDB.api && _KDB.api.header;
    if (!api || _state.readActiveEditTarget(_KDB.state.header) !== _target) return;
    var rt = _KDB.runtime.header;
    var node = _target === "subtitle" ? rt.domRefs.subtitleEl : rt.domRefs.titleEl;
    api.dispatch({
      type: _target === "subtitle" ? "header/commitSubtitle" : "header/commitTitle",
      payload: { source: rt.activeEditSource || "api", text: node ? String(node.textContent || "") : "" }
    });
  }

  function scheduleCommit(_KDB, _target) {
    _rt.scheduleTimeout(_KDB.runtime.header.timers, "editCommit", commitCurrentEdit.bind(null, _KDB, _target), 0);
  }

  function onEditKeyDown(_KDB, _target, _event) {
    if (!_event || _event.key !== "Enter") return;
    _event.preventDefault();
    commitCurrentEdit(_KDB, _target);
  }

  function onDocumentPointerDown(_KDB, _target, _node, _event) {
    var eventTarget = _event && _event.target;
    if (eventTarget && (eventTarget === _node || _node.contains(eventTarget))) return;
    scheduleCommit(_KDB, _target);
  }

  function bindHeaderEditSession(_KDB, _action) {
    var rt = _KDB.runtime.header;
    var domRefs = rt.domRefs;
    var target = _state.readActiveEditTarget(_KDB.state.header);
    if (!target || !domRefs.rootEl) {
      endEditSession(_KDB);
      rt.activeEditSource = null;
      return;
    }
    if (rt.currentEditTarget === target && rt.abortControllers.editSession) return;
    endEditSession(_KDB);
    var node = target === "subtitle" ? domRefs.subtitleEl : domRefs.titleEl;
    if (!node) return;
    var controller = new AbortController();
    var options = { signal: controller.signal };
    rt.abortControllers.editSession = controller;
    rt.currentEditTarget = target;
    if (_action && _action.payload && _action.payload.source) rt.activeEditSource = _action.payload.source;
    node.addEventListener("keydown", onEditKeyDown.bind(null, _KDB, target), options);
    node.addEventListener("blur", scheduleCommit.bind(null, _KDB, target), options);
    document.addEventListener("pointerdown", onDocumentPointerDown.bind(null, _KDB, target, node), options);
    scheduleFocus(_KDB, target, node);
  }

  return { bindHeaderEditSession: bindHeaderEditSession };
});
