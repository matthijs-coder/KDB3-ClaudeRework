define([
  "../effects/dispatchFilterHandoff.js",
  "../effects/resolveScopedPopupMount.js",
  "../runtime/readDockRoot.js",
  "./detachPopupDisplayResync.js",
  "./observePopupDisplayMutations.js",
  "./schedulePopupDisplayResync.js"
], function (
  _dispatchFilterHandoff,
  _resolveScopedPopupMount,
  _readDockRoot,
  _detachPopupDisplayResync,
  _observePopupDisplayMutations,
  _schedulePopupDisplayResync
) {
  "use strict";

  function withResyncSource(_options, _source) {
    return Object.assign({}, _options || {}, { resyncSource: _source });
  }

  function readLastClickedFilter(_KDB, _attachContext) {
    if (_attachContext && _attachContext.lastClickedFilter) {
      return _attachContext.lastClickedFilter;
    }
    return _KDB && _KDB.state && _KDB.state.filters && _KDB.state.filters.filterDock
      ? _KDB.state.filters.filterDock.lastClickedFilter
      : null;
  }

  function attachPopupDisplayResyncObserver(_KDB, _runtime, _options, _attachContext) {
    var lastClickedFilter;
    var selectors;
    var dockRoot;
    var scopeContext;
    var popupMount;
    var observer;
    if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
      return false;
    }
    lastClickedFilter = readLastClickedFilter(_KDB, _attachContext);
    if (
      !lastClickedFilter ||
      !_dispatchFilterHandoff.ownerNeedsPopupDisplayResync(lastClickedFilter.filterType)
    ) {
      return false;
    }
    try {
      _detachPopupDisplayResync(_runtime);
      selectors = _KDB.elements.selectors.filterDock;
      dockRoot = _readDockRoot(_KDB);
      scopeContext = _resolveScopedPopupMount.buildScopeContext(
        lastClickedFilter,
        selectors,
        _runtime
      );
      if (
        !scopeContext ||
        !dockRoot ||
        (lastClickedFilter.filterType === "dienststelle" &&
          scopeContext.hostDataId === "Dienststelle_BW")
      ) {
        return false;
      }
      popupMount = _resolveScopedPopupMount({
        filterEl: null,
        dockRoot: dockRoot,
        selectors: selectors,
        runtime: _runtime,
        scopeType: scopeContext.scopeType,
        hostDataId: scopeContext.hostDataId
      });
      if (!popupMount) {
        return false;
      }
      observer = new MutationObserver(
        _observePopupDisplayMutations.bind(null, _KDB, _runtime, _options)
      );
      observer.observe(popupMount, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-label", "title"],
        characterData: true
      });
      _runtime.observers = _runtime.observers || {};
      _runtime.observers.popupDisplayResync = observer;
      _runtime.popupDisplayResyncSession = {
        filterId: lastClickedFilter.filterId,
        filterType: lastClickedFilter.filterType,
        scopeType: scopeContext.scopeType,
        hostDataId: scopeContext.hostDataId,
        mountEl: popupMount,
        attachedAt: Date.now()
      };
      _schedulePopupDisplayResync(
        _KDB,
        _runtime,
        withResyncSource(_options, "openAttach")
      );
      return true;
    } catch (error) {
      console.error("[filterDock.attachPopupDisplayResyncObserver] failed", error);
      _detachPopupDisplayResync(_runtime);
      return false;
    }
  }

  return {
    attach: attachPopupDisplayResyncObserver,
    detach: _detachPopupDisplayResync
  };
});
