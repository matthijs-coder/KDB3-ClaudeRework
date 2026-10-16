define(["../events/eventNames"], function (_eventNames) {
  "use strict";
  var kdbForFrameworkSectionToggles = null;
  function readFrameworkBindContext(_KDB) {
    return _KDB && _KDB.runtime && _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.frameworkBindContext;
  }
  function sectionIdFromTarget(t) {
    while (t && t !== document.body) {
      if (t.getAttribute && t.getAttribute("data-section-id")) return t.getAttribute("data-section-id");
      t = t.parentNode;
    }
    return null;
  }
  function sectionActivateDispatch(ctx, sectionId) {
    if (!sectionId) return;
    ctx.dispatch({ type: _eventNames.ACTION_FRAMEWORK_TOGGLE_SECTION, payload: { sectionId: sectionId } });
    if (typeof ctx.syncView === "function") ctx.syncView();
  }
  function sectionContentOnClick(ev) {
    var ctx = readFrameworkBindContext(kdbForFrameworkSectionToggles);
    if (!ctx) return;
    var sid = sectionIdFromTarget(ev.target);
    if (!sid) return;
    ev.preventDefault();
    sectionActivateDispatch(ctx, sid);
  }
  function sectionContentOnKeydown(ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    var ctx = readFrameworkBindContext(kdbForFrameworkSectionToggles);
    if (!ctx) return;
    var sid = sectionIdFromTarget(ev.target);
    if (!sid) return;
    ev.preventDefault();
    sectionActivateDispatch(ctx, sid);
  }
  function __controller(_ctx, _signal) {
    var el = _ctx.contentEl;
    if (!el) return;
    kdbForFrameworkSectionToggles = _ctx._KDB;
    el.addEventListener("click", sectionContentOnClick, { signal: _signal });
    el.addEventListener("keydown", sectionContentOnKeydown, { signal: _signal });
  }
  return __controller;
});
