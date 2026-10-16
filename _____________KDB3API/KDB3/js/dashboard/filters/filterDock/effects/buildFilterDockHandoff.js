define([], function () {
  "use strict";

  function buildHandoff(_input) {
    return {
      filterId: _input.filterId,
      filterKey: _input.filterKey,
      filterInstanceId: _input.filterInstanceId,
      filterLabel: _input.filterLabel,
      itemNameHint: _input.itemNameHint,
      itemIdHint: _input.itemIdHint,
      semanticInstanceKeyHint: _input.semanticInstanceKeyHint,
      filterType: _input.filterType,
      filterScope: _input.filterScope,
      scopeType: _input.scopeType,
      tabId: _input.tabId,
      scopeId: _input.scopeId,
      scopeResolution: _input.scopeResolution,
      legacyScope: _input.legacyScope,
      legacyScopeId: _input.legacyScopeId,
      tabContextDiagnostic: _input.tabContextDiagnostic,
      filterConfig: _input.filterConfig,
      capabilities: _input.capabilities,
      interactionType: _input.interactionType,
      isAlleOption: _input.isAlleOption,
      optionLabel: _input.optionLabel,
      confirmedLabels: _input.confirmedLabels,
      sourceElementSignature: _input.sourceElementSignature,
      popup: _input.popup,
      observedAt: _input.observedAt
    };
  }

  function buildClickResolution(_handoff, _filterEl, _observedAt) {
    return {
      lastClickedFilter: {
        filterId: _handoff.filterId,
        filterKey: _handoff.filterKey,
        filterLabel: _handoff.filterLabel,
        filterType: _handoff.filterType,
        filterScope: _handoff.filterScope,
        scopeType: _handoff.scopeType,
        tabId: _handoff.tabId,
        scopeId: _handoff.scopeId,
        scopeResolution: _handoff.scopeResolution,
        filterInstanceId: _handoff.filterInstanceId,
        itemNameHint: _handoff.itemNameHint,
        itemIdHint: _handoff.itemIdHint,
        semanticInstanceKeyHint: _handoff.semanticInstanceKeyHint,
        legacyScope: _handoff.legacyScope,
        legacyScopeId: _handoff.legacyScopeId,
        tabContextDiagnostic: _handoff.tabContextDiagnostic,
        sourceElementSignature: _handoff.sourceElementSignature,
        clickedAt: _observedAt
      },
      interaction: _handoff,
      filterEl: _filterEl
    };
  }

  return {
    buildHandoff: buildHandoff,
    buildClickResolution: buildClickResolution
  };
});
