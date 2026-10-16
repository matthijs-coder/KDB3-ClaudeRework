define([
  "../ownerRouter.js",
  "../interaction/dockDom.js",
  "./popupReadySession.js",
  "../../../../core/utils/kit/data.js"
], function (_ownerRouter, _dockDom, _popupReadySession, _data) {
  "use strict";

  function buildPopupReadyHandoff(lastClickedFilter, lastInteraction, popup) {
    var capabilities;
    var filterConfig;
    if (!lastClickedFilter || !popup) {
      return null;
    }
    capabilities = lastInteraction && lastInteraction.capabilities ? _data.cloneJson(lastInteraction.capabilities) : {};
    filterConfig = lastInteraction && lastInteraction.filterConfig ? _data.cloneJson(lastInteraction.filterConfig) : {};
    return {
      filterId: lastClickedFilter.filterId,
      filterKey: lastClickedFilter.filterKey,
      filterInstanceId: lastClickedFilter.filterInstanceId,
      filterLabel: lastClickedFilter.filterLabel,
      itemNameHint: lastClickedFilter.itemNameHint,
      itemIdHint: lastClickedFilter.itemIdHint,
      semanticInstanceKeyHint: lastClickedFilter.semanticInstanceKeyHint,
      filterType: lastClickedFilter.filterType,
      filterScope: lastClickedFilter.filterScope,
      scopeType: lastClickedFilter.scopeType || lastClickedFilter.filterScope,
      tabId: lastClickedFilter.tabId || null,
      scopeId: lastClickedFilter.scopeId,
      scopeResolution: lastClickedFilter.scopeResolution || null,
      legacyScope: lastClickedFilter.legacyScope || null,
      legacyScopeId: lastClickedFilter.legacyScopeId || null,
      tabContextDiagnostic: lastClickedFilter.tabContextDiagnostic || null,
      filterConfig: filterConfig,
      capabilities: capabilities,
      interactionType: "open",
      isAlleOption: false,
      optionLabel: null,
      popup: Object.assign({}, popup),
      observedAt: popup.observedAt || Date.now()
    };
  }

  function dispatchPopupReadyHandoff(ctx, popup, mutationSummary, dockRoot, selectors, lastClickedFilter, lastInteraction) {
    var runtime = ctx.runtime;
    var handoff;
    var selectionSyncGap;
    var decision;
    if (_popupReadySession.shouldDispatchPopupReadyTransition(runtime, popup, lastClickedFilter)) {
      handoff = buildPopupReadyHandoff(lastClickedFilter, lastInteraction, popup);
    } else {
      selectionSyncGap = _dockDom.readPopupSelectionSyncGap(dockRoot, selectors, runtime);
      decision = _popupReadySession.decidePostReadyResync(
        _popupReadySession.ensurePopupReadyState(runtime),
        popup,
        lastClickedFilter,
        mutationSummary,
        function () { return selectionSyncGap; }
      );
      if (!decision.dispatch) {
        return;
      }
      handoff = buildPopupReadyHandoff(lastClickedFilter, lastInteraction, popup);
    }
    if (!handoff || !handoff.filterKey || !String(handoff.filterKey).trim()) {
      console.warn("[filterDock.dispatchPopupReadyHandoff] skipped: missing filterKey");
      return;
    }
    _ownerRouter.dispatchHandoffToOwner(ctx._KDB, handoff, "popupReady");
  }

  return {
    buildPopupReadyHandoff: buildPopupReadyHandoff,
    dispatchPopupReadyHandoff: dispatchPopupReadyHandoff
  };
});
