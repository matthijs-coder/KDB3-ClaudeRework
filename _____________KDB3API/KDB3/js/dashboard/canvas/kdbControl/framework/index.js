define([
  "./buildControlShell.js",
  "./bindPanelToggles.js",
  "./bindControlInputs.js",
  "./bindToolboxActions.js",
  "./syncView.js",
  "./followActiveTab.js",
  "../effects.js",
  "../config/domSelectors.js",
  "../../../header/events/eventNames.js"
], function (
  _buildControlShell, _bindPanelToggles, _bindControlInputs, _bindToolboxActions,
  _syncFrameworkViewFromState, _followActiveTab, _effects, _domSelectors, _headerEventNames
) {
  "use strict";

  function resolveMountTarget(_KDB) {
    var selector = _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root && _KDB.elements.selectors.root.kdbWidget;
    var target = selector ? document.querySelector(selector) : null;
    // Fallback read of another module's runtime; scheduled to become an API in Phase 2.
    var coreDomRefs = _KDB.runtime.core && _KDB.runtime.core.domRefs;
    return target || (coreDomRefs && coreDomRefs.renderParentEl) || null;
  }

  function placeControlShell(_KDB, shell) {
    var dr = _KDB.runtime.kdbControl.domRefs;
    var mountTarget = resolveMountTarget(_KDB);
    dr.mountTargetEl = mountTarget;
    if (!mountTarget) {
      console.warn("[kdbControl.placeControlShell] mount target not found");
      return;
    }
    if (shell.parentNode !== mountTarget) mountTarget.appendChild(shell);
    dr.placedShell = shell;
    dr.rootEl = shell;
    dr.contentEl = shell.querySelector(_domSelectors.contentSelector);
    dr.arrowEl = shell.querySelector(_domSelectors.arrowSelector);
    dr.settingsOuterEl = shell.querySelector(_domSelectors.settingsOuterSelector);
    dr.saveLoadSlotEl = shell.querySelector(_domSelectors.saveLoadSlotSelector);
    _effects.startSaveLoadSlotLoading(_KDB, dr.saveLoadSlotEl);
    dr.mainTogglesEl = shell.querySelector(_domSelectors.mainTogglesSelector);
    dr.mainBlocksEl = shell.querySelector(_domSelectors.mainBlocksSelector);
    dr.metricsContainerEl = shell.querySelector(_domSelectors.metricsContainerSelector);
    dr.toolboxContainerEl = shell.querySelector(_domSelectors.toolboxContainerSelector);
    dr.settingsContainerEl = shell.querySelector(_domSelectors.settingsContainerSelector);
  }

  // Creates the bind context other modules call through `runtime.kdbControl.frameworkBindContext.syncView()`.
  function bindFrameworkView(_KDB, surface) {
    var rt = _KDB.runtime.kdbControl;
    var rootEl = rt.domRefs.rootEl;
    var contentEl = rt.domRefs.contentEl;
    if (!rootEl || !contentEl) return false;
    var previous = rt.abortControllers.frameworkView;
    if (previous) previous.abort();
    var scope = new AbortController();
    rt.abortControllers.frameworkView = scope;
    var ctx = {
      _KDB: _KDB,
      dispatch: surface.dispatch,
      getState: surface.getState,
      rootEl: rootEl,
      contentEl: contentEl,
      syncView: function syncView() {
        try {
          _syncFrameworkViewFromState(_KDB);
        } catch (err) {
          console.error("[kdbControl.syncView] failed", err);
        }
      }
    };
    rt.frameworkBindContext = ctx;
    _bindPanelToggles(ctx, scope.signal);
    _bindControlInputs(ctx, scope.signal);
    _bindToolboxActions(ctx, scope.signal);
    ctx.syncView();
    return true;
  }

  // Builds, places and binds the control panel shell; returns the shell element or null when it could not be bound.
  function mountFramework(_KDB, surface) {
    var shell = _buildControlShell(_KDB);
    placeControlShell(_KDB, shell);
    if (!bindFrameworkView(_KDB, surface)) return null;
    var ctx = _KDB.runtime.kdbControl.frameworkBindContext;
    if (_KDB.events && typeof _KDB.events.subscribe === "function") {
      _KDB.runtime.kdbControl.subscriptions.headerFooterToolboxReadSync = _KDB.events.subscribe(_headerEventNames.HEADER_CONFIRMED_CHANGED, ctx.syncView);
    }
    _followActiveTab(_KDB);
    return shell;
  }

  return mountFramework;
});
