define(["../events/eventNames"], function (_eventNames) {
  "use strict";
  var kdbForFrameworkCollapse = null;
  function readFrameworkBindContext(_KDB) {
    return _KDB && _KDB.runtime && _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.frameworkBindContext;
  }
  function collapseRunToggleDispatch(ctx) {
    var st = ctx.getState();
    var cur = st && st.framework ? !!st.framework.isCollapsed : false;
    ctx.dispatch({ type: _eventNames.ACTION_FRAMEWORK_TOGGLE_COLLAPSE, payload: { isCollapsed: !cur } });
    if (typeof ctx.syncView === "function") ctx.syncView();
  }
  function collapseOnClick(ev) {
    var ctx = readFrameworkBindContext(kdbForFrameworkCollapse);
    if (!ctx) return;
    ev.preventDefault();
    collapseRunToggleDispatch(ctx);
  }
  function collapseOnKeydown(ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var ctx = readFrameworkBindContext(kdbForFrameworkCollapse);
    if (!ctx) return;
    ev.preventDefault();
    collapseRunToggleDispatch(ctx);
  }
  function __controller(_ctx, _signal) {
    var dr = _ctx._KDB.runtime && _ctx._KDB.runtime.kdbControl && _ctx._KDB.runtime.kdbControl.domRefs;
    var arrow = dr && dr.arrowEl;
    if (!arrow) return;
    kdbForFrameworkCollapse = _ctx._KDB;
    arrow.addEventListener("click", collapseOnClick, { signal: _signal });
    arrow.addEventListener("keydown", collapseOnKeydown, { signal: _signal });
  }
  return __controller;
});
