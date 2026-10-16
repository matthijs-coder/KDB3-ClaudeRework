define(["../config.js", "../ownerRoutes.js"], function (_config, _ownerRoutes) {
  "use strict";

  function ensurePopupReadyState(runtime) {
    if (!runtime.popupReadyState) {
      runtime.popupReadyState = {
        activeFilterKey: null,
        isReady: false,
        postReadyResyncDispatched: false,
        mutationGeneration: 0,
        lastAttributeSignature: null
      };
    }
    return runtime.popupReadyState;
  }

  function clearReadySession(state) {
    state.isReady = false;
    state.activeFilterKey = null;
    state.postReadyResyncDispatched = false;
    state.lastAttributeSignature = null;
  }

  function resetPopupReadyState(runtime) {
    if (runtime.popupReadyState) {
      clearReadySession(runtime.popupReadyState);
    }
  }

  function resetSessionOnSingleSelectClick(runtime, interaction) {
    if (!runtime || !interaction || !_ownerRoutes.isSingleSelectFamily(interaction.filterType)) {
      return false;
    }
    if (_config.RESET_SESSION_INTERACTION_TYPES[interaction.interactionType] === true) {
      resetPopupReadyState(runtime);
      return true;
    }
    return false;
  }

  function isPopupReady(popup) {
    return !!(popup && popup.isVisible === true && popup.hasOptions === true && popup.optionCount > 0);
  }

  function readActiveFilterKey(popup, lastClickedFilter) {
    if (popup && popup.activeFilterId) {
      return String(popup.activeFilterId).trim();
    }
    if (lastClickedFilter && lastClickedFilter.filterKey) {
      return String(lastClickedFilter.filterKey).trim();
    }
    if (lastClickedFilter && lastClickedFilter.filterId) {
      return String(lastClickedFilter.filterId).trim();
    }
    return "";
  }

  function popupMatchesActiveFilter(popup, lastClickedFilter) {
    var activeFilterKey = readActiveFilterKey(popup, lastClickedFilter);
    if (!activeFilterKey || !lastClickedFilter) {
      return false;
    }
    return (
      activeFilterKey === lastClickedFilter.filterId ||
      activeFilterKey === lastClickedFilter.filterKey ||
      activeFilterKey === lastClickedFilter.filterLabel
    );
  }

  function shouldDispatchPopupReadyTransition(runtime, popup, lastClickedFilter) {
    var state;
    var activeFilterKey;
    if (!runtime || !lastClickedFilter) {
      return false;
    }
    state = ensurePopupReadyState(runtime);
    activeFilterKey = readActiveFilterKey(popup, lastClickedFilter);
    if (!isPopupReady(popup) || !activeFilterKey || !popupMatchesActiveFilter(popup, lastClickedFilter)) {
      if (state.isReady) {
        clearReadySession(state);
      }
      return false;
    }
    if (state.activeFilterKey !== activeFilterKey) {
      state.isReady = false;
      state.postReadyResyncDispatched = false;
      state.lastAttributeSignature = null;
    }
    if (state.isReady && state.activeFilterKey === activeFilterKey) {
      return false;
    }
    state.isReady = true;
    state.activeFilterKey = activeFilterKey;
    state.postReadyResyncDispatched = false;
    state.mutationGeneration = 0;
    state.lastAttributeSignature = null;
    return true;
  }

  function hasRelevantMutation(summary) {
    return !!(summary && (summary.addedCount || summary.removedCount || summary.attributeCount || summary.hasAttributeMutations === true));
  }

  function markPostReadyDispatched(state) {
    state.postReadyResyncDispatched = true;
    state.mutationGeneration = (state.mutationGeneration || 0) + 1;
  }

  // `readGap` is a function: the DOM read only happens when the decision reaches the selection-sync check.
  function decidePostReadyResync(state, popup, lastClickedFilter, mutationSummary, readGap) {
    var summary = mutationSummary || null;
    if (!state || !lastClickedFilter) {
      return { dispatch: false, reason: "missingInput" };
    }
    if (!_ownerRoutes.isSingleSelectFamily(lastClickedFilter.filterType)) {
      return { dispatch: false, reason: "notSingleSelectFamily" };
    }
    if (state.isReady !== true) {
      return { dispatch: false, reason: "popupNotReadySession" };
    }
    if (state.postReadyResyncDispatched === true) {
      return { dispatch: false, reason: "followUpAlreadyDispatched" };
    }
    if (!isPopupReady(popup) || !popupMatchesActiveFilter(popup, lastClickedFilter)) {
      return { dispatch: false, reason: "popupNotMatchingActiveFilter" };
    }
    if (!hasRelevantMutation(summary)) {
      return { dispatch: false, reason: "noRelevantMutation" };
    }
    if (readGap() === true) {
      markPostReadyDispatched(state);
      return { dispatch: true, reason: "selectionSyncGap" };
    }
    if (summary.hasNonKdbAttributeMutations === true || summary.nonKdbAttributeCount > 0) {
      markPostReadyDispatched(state);
      if (summary.lastNonKdbAttributeSignature) {
        state.lastAttributeSignature = summary.lastNonKdbAttributeSignature;
      } else if (summary.lastAttributeSignature) {
        state.lastAttributeSignature = summary.lastAttributeSignature;
      }
      return { dispatch: true, reason: "nonKdbAttributeMutation" };
    }
    if (summary.hasAttributeMutations === true) {
      if (summary.lastAttributeSignature) {
        state.lastAttributeSignature = summary.lastAttributeSignature;
      }
      return { dispatch: false, reason: "kdbOnlyAttributeMutation" };
    }
    return { dispatch: false, reason: "noQualifyingSignal" };
  }

  return {
    ensurePopupReadyState: ensurePopupReadyState,
    clearReadySession: clearReadySession,
    resetPopupReadyState: resetPopupReadyState,
    resetSessionOnSingleSelectClick: resetSessionOnSingleSelectClick,
    isPopupReady: isPopupReady,
    readActiveFilterKey: readActiveFilterKey,
    popupMatchesActiveFilter: popupMatchesActiveFilter,
    shouldDispatchPopupReadyTransition: shouldDispatchPopupReadyTransition,
    decidePostReadyResync: decidePostReadyResync
  };
});
