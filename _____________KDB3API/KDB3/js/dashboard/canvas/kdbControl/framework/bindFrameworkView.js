define([
  "./bindFrameworkCollapse",
  "./bindFrameworkTopToggles",
  "./bindFrameworkSectionToggles",
  "./bindFrameworkPrimitiveVisuals",
  "./bindFrameworkKdbActionToggles",
  "./bindFrameworkToolboxPlaceholderApis",
  "./syncFrameworkViewFromState",
], function (
  _bindCollapse,
  _bindTop,
  _bindSections,
  _bindPrimitives,
  _bindKdbActionToggles,
  _bindToolboxPlaceholderApis,
  _syncFrameworkViewFromState
) {
  "use strict";
  function createSyncViewThunk(_sync, _KDB) {
    return function frameworkSyncView() {
      _sync(_KDB);
    };
  }
  function __controller(_KDB, _surface) {
    const rt = _KDB.runtime && _KDB.runtime.kdbControl;
    if (!rt || !rt.domRefs) return false;
    const dr = rt.domRefs;
    const rootEl = dr.rootEl;
    const contentEl = dr.contentEl;
    if (!rootEl || !contentEl) return false;
    const acPrev = rt.abortControllers && rt.abortControllers.frameworkView;
    if (acPrev && typeof acPrev.abort === "function") acPrev.abort();
    rt.abortControllers = rt.abortControllers || {};
    const ctrl = new AbortController();
    rt.abortControllers.frameworkView = ctrl;
    const signal = ctrl.signal;
    const ctx = {
      _KDB: _KDB,
      dispatch: _surface.dispatch,
      getState: _surface.getState,
      rootEl: rootEl,
      contentEl: contentEl,
      syncView: createSyncViewThunk(_syncFrameworkViewFromState, _KDB),
    };
    rt.frameworkBindContext = ctx;
    _bindCollapse(ctx, signal);
    _bindTop(ctx, signal);
    _bindSections(ctx, signal);
    _bindPrimitives(ctx, signal);
    _bindKdbActionToggles(ctx, signal);
    _bindToolboxPlaceholderApis(ctx, signal);
    ctx.syncView();
    return true;
  }
  return __controller;
});
