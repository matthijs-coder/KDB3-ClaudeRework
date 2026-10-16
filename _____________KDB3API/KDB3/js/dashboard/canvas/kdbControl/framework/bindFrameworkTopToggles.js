define(["../events/eventNames"], function (_eventNames) {
  "use strict";
  var kdbForFrameworkTopToggles = null;
  function readFrameworkBindContext(_KDB) {
    return _KDB && _KDB.runtime && _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.frameworkBindContext;
  }
  function topTogglesPanelFromTarget(t) {
    while (t && t !== document.body) {
      if (t.getAttribute && t.getAttribute("data-panel-id")) return t.getAttribute("data-panel-id");
      t = t.parentNode;
    }
    return null;
  }
  function topPanelActivateDispatch(ctx, panelId) {
    if (!panelId) return;
    ctx.dispatch({ type: _eventNames.ACTION_FRAMEWORK_SELECT_PANEL, payload: { panelId: panelId } });
    if (typeof ctx.syncView === "function") ctx.syncView();
  }
  function topTogglesOnClick(ev) {
    var ctx = readFrameworkBindContext(kdbForFrameworkTopToggles);
    if (!ctx) return;
    var pid = topTogglesPanelFromTarget(ev.target);
    if (!pid) return;
    ev.preventDefault();
    topPanelActivateDispatch(ctx, pid);
  }
  function topTogglesOnKeydown(ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var ctx = readFrameworkBindContext(kdbForFrameworkTopToggles);
    if (!ctx) return;
    var pid = topTogglesPanelFromTarget(ev.target);
    if (!pid) return;
    ev.preventDefault();
    topPanelActivateDispatch(ctx, pid);
  }
  function __controller(_ctx, _signal) {
    var el = _ctx._KDB.runtime && _ctx._KDB.runtime.kdbControl && _ctx._KDB.runtime.kdbControl.domRefs && _ctx._KDB.runtime.kdbControl.domRefs.mainTogglesEl;
    if (!el) return;
    kdbForFrameworkTopToggles = _ctx._KDB;
    el.addEventListener("click", topTogglesOnClick, { signal: _signal });
    el.addEventListener("keydown", topTogglesOnKeydown, { signal: _signal });
  }
  return __controller;
});
