define([
  "../config.js",
  "../ownerRoutes.js",
  "../selectors.js",
  "../interaction/dockDom.js",
  "./popupDisplayResyncDispatch.js"
], function (_config, _ownerRoutes, _selectors, _dockDom, _dispatch) {
  "use strict";

  var OPTION_LABEL_CLASS = String(_config.CHROME.optionLabelSelector || "").replace(/^\./, "");

  function isPopupLabelElement(element) {
    if (!element || element.nodeType !== 1) {
      return false;
    }
    if (element.getAttribute && element.getAttribute("data-tid") === _config.CHROME.optionLabelTid) {
      return true;
    }
    return !!(element.classList && element.classList.contains(OPTION_LABEL_CLASS));
  }

  function isRelevantCharacterDataMutation(record) {
    return !!record && record.type === "characterData" && isPopupLabelElement(record.target && record.target.parentElement);
  }

  function hasRelevantCharacterDataMutation(records) {
    return !!records && Array.prototype.some.call(records, isRelevantCharacterDataMutation);
  }

  function isRelevantMutation(records) {
    return !!records && Array.prototype.some.call(records, function (record) {
      return record.type === "childList" ||
        isRelevantCharacterDataMutation(record) ||
        (record.type === "attributes" && (record.attributeName === "aria-label" || record.attributeName === "title"));
    });
  }

  function detachPopupDisplayResync(runtime) {
    var observer = runtime.observers.popupDisplayResync;
    _dispatch.clearPopupDisplayResyncTimers(runtime);
    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
    }
    runtime.observers.popupDisplayResync = null;
    delete runtime.popupDisplayResyncPendingSource;
    delete runtime.popupDisplayResyncSession;
  }

  function shouldSelfDetach(ctx) {
    var _KDB = ctx._KDB;
    var session = ctx.runtime.popupDisplayResyncSession;
    var mountEl = session && session.mountEl;
    var lastClicked;
    var selectors;
    var scopeContext;
    var popup;
    if (!mountEl) {
      return true;
    }
    if (typeof document !== "undefined" && document.documentElement && !document.documentElement.contains(mountEl)) {
      return true;
    }
    lastClicked = _selectors.readLastClickedFilter(_KDB);
    if (!lastClicked || !_ownerRoutes.ownerNeedsPopupDisplayResync(lastClicked.filterType)) {
      return true;
    }
    selectors = _selectors.readDockSelectors(_KDB);
    scopeContext = selectors ? _dockDom.buildScopeContext(lastClicked, selectors, ctx.runtime) : null;
    if (
      !scopeContext ||
      session.hostDataId !== scopeContext.hostDataId ||
      session.scopeType !== scopeContext.scopeType ||
      _ownerRoutes.skipsPopupDisplayResync(lastClicked.filterType, scopeContext.hostDataId)
    ) {
      return true;
    }
    popup = _selectors.readPopupState(_KDB);
    return !!popup && popup.isVisible === false;
  }

  // MutationObserver boundary.
  function onPopupDisplayMutations(ctx, records) {
    try {
      if (ctx.isDisposed()) {
        return;
      }
      if (shouldSelfDetach(ctx)) {
        detachPopupDisplayResync(ctx.runtime);
        return;
      }
      if (!isRelevantMutation(records)) {
        return;
      }
      if (hasRelevantCharacterDataMutation(records)) {
        _dispatch.dispatchPopupDisplayResync(ctx, "mountMutationCharacterDataSync");
      }
      _dispatch.schedulePopupDisplayResync(ctx, "mountMutation");
    } catch (error) {
      console.error("[filterDock.onPopupDisplayMutations] failed", error);
      detachPopupDisplayResync(ctx.runtime);
    }
  }

  function attachPopupDisplayResync(ctx, lastClickedFilter) {
    var _KDB = ctx._KDB;
    var runtime = ctx.runtime;
    var selectors;
    var dockRoot;
    var scopeContext;
    var popupMount;
    var observer;
    if (ctx.isDisposed()) {
      return false;
    }
    if (!lastClickedFilter || !_ownerRoutes.ownerNeedsPopupDisplayResync(lastClickedFilter.filterType)) {
      return false;
    }
    detachPopupDisplayResync(runtime);
    selectors = _selectors.readDockSelectors(_KDB);
    dockRoot = _dockDom.readDockRoot(_KDB);
    scopeContext = _dockDom.buildScopeContext(lastClickedFilter, selectors, runtime);
    if (!scopeContext || !dockRoot || _ownerRoutes.skipsPopupDisplayResync(lastClickedFilter.filterType, scopeContext.hostDataId)) {
      return false;
    }
    popupMount = _dockDom.resolveScopedPopupMount({
      filterEl: null,
      dockRoot: dockRoot,
      selectors: selectors,
      runtime: runtime,
      scopeType: scopeContext.scopeType,
      hostDataId: scopeContext.hostDataId
    });
    if (!popupMount) {
      return false;
    }
    observer = new MutationObserver(function (records) {
      onPopupDisplayMutations(ctx, records);
    });
    observer.observe(popupMount, _config.POPUP_DISPLAY_OBSERVER_OPTIONS);
    runtime.observers.popupDisplayResync = observer;
    runtime.popupDisplayResyncSession = {
      filterId: lastClickedFilter.filterId,
      filterType: lastClickedFilter.filterType,
      scopeType: scopeContext.scopeType,
      hostDataId: scopeContext.hostDataId,
      mountEl: popupMount,
      attachedAt: Date.now()
    };
    _dispatch.schedulePopupDisplayResync(ctx, "openAttach");
    return true;
  }

  function toLastClickedFilter(interaction) {
    return {
      filterId: interaction.filterId,
      filterKey: interaction.filterKey,
      filterInstanceId: interaction.filterInstanceId,
      filterLabel: interaction.filterLabel,
      itemNameHint: interaction.itemNameHint,
      itemIdHint: interaction.itemIdHint,
      semanticInstanceKeyHint: interaction.semanticInstanceKeyHint,
      filterType: interaction.filterType,
      filterScope: interaction.filterScope,
      scopeType: interaction.scopeType,
      tabId: interaction.tabId,
      scopeId: interaction.scopeId,
      scopeResolution: interaction.scopeResolution,
      legacyScope: interaction.legacyScope,
      legacyScopeId: interaction.legacyScopeId,
      tabContextDiagnostic: interaction.tabContextDiagnostic
    };
  }

  function attachPopupDisplayResyncOnOpen(ctx, interaction) {
    if (ctx.isDisposed() || !interaction) {
      return;
    }
    if (_config.DETACH_INTERACTION_TYPES[interaction.interactionType]) {
      detachPopupDisplayResync(ctx.runtime);
      return;
    }
    if (interaction.interactionType !== "open") {
      return;
    }
    if (!_ownerRoutes.ownerNeedsPopupDisplayResync(interaction.filterType)) {
      detachPopupDisplayResync(ctx.runtime);
      return;
    }
    attachPopupDisplayResync(ctx, toLastClickedFilter(interaction));
  }

  return {
    attachPopupDisplayResyncOnOpen: attachPopupDisplayResyncOnOpen,
    attachPopupDisplayResync: attachPopupDisplayResync,
    detachPopupDisplayResync: detachPopupDisplayResync,
    onPopupDisplayMutations: onPopupDisplayMutations,
    shouldSelfDetach: shouldSelfDetach,
    isRelevantMutation: isRelevantMutation,
    hasRelevantCharacterDataMutation: hasRelevantCharacterDataMutation
  };
});
