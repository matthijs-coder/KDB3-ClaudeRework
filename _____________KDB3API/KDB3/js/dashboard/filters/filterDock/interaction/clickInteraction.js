define([
  "../config.js",
  "../identity.js",
  "../ownerRoutes.js",
  "../selectors.js",
  "../observation/mutationSummary.js",
  "./dockDom.js"
], function (_config, _identity, _ownerRoutes, _selectors, _mutationSummary, _dockDom) {
  "use strict";

  function isDisabledButton(buttonEl, selectors) {
    return !!(buttonEl && buttonEl.classList && buttonEl.classList.contains(selectors.disabledButtonClass));
  }

  function readOkCancelState(target, selectors) {
    var okEl = target && target.closest && selectors.okButtonSelector ? target.closest(selectors.okButtonSelector) : null;
    var cancelEl = target && target.closest && selectors.cancelButtonSelector
      ? target.closest(selectors.cancelButtonSelector)
      : null;
    if (isDisabledButton(okEl, selectors) || isDisabledButton(cancelEl, selectors)) {
      return null;
    }
    return { clickedOk: !!okEl, clickedCancel: !!cancelEl };
  }

  function readClickFlags(target, selectors, okCancelState) {
    return {
      clickedOk: okCancelState.clickedOk,
      clickedCancel: okCancelState.clickedCancel,
      clickedClear: !!(selectors.clearButtonSelector && target.closest(selectors.clearButtonSelector)),
      clickedClose: !!(selectors.closeButtonSelector && target.closest(selectors.closeButtonSelector))
    };
  }

  function readAlleAndOption(target, selectors) {
    var alleSelector = selectors.alleOptionSelector;
    var optionEl;
    if (alleSelector && target && target.closest && target.closest(alleSelector)) {
      return { isAlleOption: true, optionLabel: "Alle" };
    }
    optionEl = target && selectors.optionSelector ? target.closest(selectors.optionSelector) : null;
    return {
      isAlleOption: false,
      optionLabel: optionEl ? _dockDom.readOptionLabelText(optionEl, selectors) || null : null
    };
  }

  function readInteractionType(target, selectors, flags, alleAndOption) {
    if (flags.clickedOk) {
      return "confirm";
    }
    if (flags.clickedCancel) {
      return "cancel";
    }
    if (flags.clickedClear) {
      return "clear";
    }
    if (flags.clickedClose) {
      return "close";
    }
    if (alleAndOption.isAlleOption) {
      return "alle";
    }
    if (target && selectors.optionSelector && target.closest(selectors.optionSelector)) {
      return "option";
    }
    return "open";
  }

  function isPopupControlClick(target, selectors) {
    return [
      "popupMountSelector", "optionSelector", "alleOptionSelector", "okButtonSelector",
      "cancelButtonSelector", "clearButtonSelector", "closeButtonSelector"
    ].some(function (key) {
      return !!(selectors[key] && target.closest(selectors[key]));
    });
  }

  function syncFilterWrapperClasses(filterEl, identity) {
    var capabilities = identity.capabilities || {};
    var filterType = identity.filterType;
    var condition = capabilities.condition;
    var isSicht = filterType === "sicht";
    if (_ownerRoutes.isSingleSelectFamily(filterType)) {
      filterEl.classList.add(_config.CLASS_SINGLE_SELECT);
    }
    if (isSicht) {
      filterEl.classList.add(_config.CLASS_SICHT);
    }
    if (capabilities.isUpstream === true && !isSicht) {
      filterEl.classList.add(_config.CLASS_CASCADING);
    }
    if (capabilities.isHierarchy === true) {
      filterEl.classList.add(_config.CLASS_HIERARCHY);
    }
    if (condition != null && String(condition).trim() !== "") {
      filterEl.classList.toggle(_config.CLASS_HIDE_ALLE, capabilities.hasAlleOption !== true);
    }
  }

  function buildHandoff(input) {
    return {
      filterId: input.filterId,
      filterKey: input.filterKey,
      filterInstanceId: input.filterInstanceId,
      filterLabel: input.filterLabel,
      itemNameHint: input.itemNameHint,
      itemIdHint: input.itemIdHint,
      semanticInstanceKeyHint: input.semanticInstanceKeyHint,
      filterType: input.filterType,
      filterScope: input.filterScope,
      scopeType: input.scopeType,
      tabId: input.tabId,
      scopeId: input.scopeId,
      scopeResolution: input.scopeResolution,
      legacyScope: input.legacyScope,
      legacyScopeId: input.legacyScopeId,
      tabContextDiagnostic: input.tabContextDiagnostic,
      filterConfig: input.filterConfig,
      capabilities: input.capabilities,
      interactionType: input.interactionType,
      isAlleOption: input.isAlleOption,
      optionLabel: input.optionLabel,
      confirmedLabels: input.confirmedLabels,
      sourceElementSignature: input.sourceElementSignature,
      popup: input.popup,
      observedAt: input.observedAt
    };
  }

  function buildClickResolution(handoff, filterEl, observedAt) {
    return {
      lastClickedFilter: {
        filterId: handoff.filterId,
        filterKey: handoff.filterKey,
        filterLabel: handoff.filterLabel,
        filterType: handoff.filterType,
        filterScope: handoff.filterScope,
        scopeType: handoff.scopeType,
        tabId: handoff.tabId,
        scopeId: handoff.scopeId,
        scopeResolution: handoff.scopeResolution,
        filterInstanceId: handoff.filterInstanceId,
        itemNameHint: handoff.itemNameHint,
        itemIdHint: handoff.itemIdHint,
        semanticInstanceKeyHint: handoff.semanticInstanceKeyHint,
        legacyScope: handoff.legacyScope,
        legacyScopeId: handoff.legacyScopeId,
        tabContextDiagnostic: handoff.tabContextDiagnostic,
        sourceElementSignature: handoff.sourceElementSignature,
        clickedAt: observedAt
      },
      interaction: handoff,
      filterEl: filterEl
    };
  }

  function resolveClickInteraction(_KDB, event, selectors) {
    var target = event && event.target;
    var runtime;
    var okCancelState;
    var filterEl;
    var identity;
    var observedAt;
    var flags;
    var alleAndOption;
    var interactionType;
    var dockRoot;
    var confirmedLabels;
    var handoff;
    if (!_KDB || !target || !selectors) {
      return null;
    }
    okCancelState = readOkCancelState(target, selectors);
    if (!okCancelState) {
      return null;
    }
    runtime = _selectors.readDockRuntime(_KDB);
    filterEl = target.closest(selectors.filterItemSelector);
    if (!filterEl && isPopupControlClick(target, selectors)) {
      filterEl = runtime && runtime.domRefs ? runtime.domRefs.activeFilterEl : null;
    }
    if (!filterEl) {
      return null;
    }
    identity = _identity.resolveFilterIdentity(_KDB, filterEl, selectors);
    if (!identity.filterLabel) {
      return null;
    }
    if (identity.tabContextDiagnostic) {
      console.warn("[filterDock.resolveClickInteraction] tab context diagnostic", {
        code: identity.tabContextDiagnostic,
        filterLabel: identity.filterLabel
      });
    }
    syncFilterWrapperClasses(filterEl, identity);

    observedAt = Date.now();
    flags = readClickFlags(target, selectors, okCancelState);
    alleAndOption = readAlleAndOption(target, selectors);
    interactionType = readInteractionType(target, selectors, flags, alleAndOption);
    dockRoot = typeof document !== "undefined" ? document.querySelector(selectors.rootSelector) : null;
    confirmedLabels = identity.filterType === "nativeMultiSelect" && interactionType === "confirm"
      ? _dockDom.readConfirmedNativeSelectLabels(filterEl, dockRoot, selectors, runtime)
      : null;
    handoff = buildHandoff({
      filterId: identity.filterId,
      filterKey: identity.filterKey,
      filterLabel: identity.filterLabel,
      filterType: identity.filterType,
      filterScope: identity.filterScope,
      scopeType: identity.scopeType,
      tabId: identity.tabId,
      scopeId: identity.scopeId,
      scopeResolution: identity.scopeResolution,
      filterInstanceId: identity.filterInstanceId,
      itemNameHint: identity.itemNameHint,
      itemIdHint: identity.itemIdHint,
      semanticInstanceKeyHint: identity.semanticInstanceKeyHint,
      legacyScope: identity.legacyScope,
      legacyScopeId: identity.legacyScopeId,
      tabContextDiagnostic: identity.tabContextDiagnostic,
      filterConfig: identity.filterConfig,
      capabilities: identity.capabilities,
      interactionType: interactionType,
      isAlleOption: alleAndOption.isAlleOption,
      optionLabel: alleAndOption.optionLabel,
      confirmedLabels: confirmedLabels,
      sourceElementSignature: _mutationSummary.buildElementSignature(target) || "",
      popup: _dockDom.readPopupSnapshot(
        filterEl, dockRoot, selectors, identity.filterId, identity.filterType, observedAt, runtime
      ),
      observedAt: observedAt
    });
    return buildClickResolution(handoff, filterEl, observedAt);
  }

  return {
    resolveClickInteraction: resolveClickInteraction,
    buildHandoff: buildHandoff,
    buildClickResolution: buildClickResolution
  };
});
