define([
  "../effects/dispatchFilterHandoff.js",
  "./syncPopupDisplay.js"
], function (_dispatchFilterHandoff, _syncPopupDisplay) {
  "use strict";

  var DETACH_INTERACTION_TYPES = {
    confirm: true,
    cancel: true,
    close: true,
    clear: true
  };

  function toLastClickedFilter(_interaction) {
    if (!_interaction) {
      return null;
    }
    return {
      filterId: _interaction.filterId,
      filterKey: _interaction.filterKey,
      filterInstanceId: _interaction.filterInstanceId,
      filterLabel: _interaction.filterLabel,
      itemNameHint: _interaction.itemNameHint,
      itemIdHint: _interaction.itemIdHint,
      semanticInstanceKeyHint: _interaction.semanticInstanceKeyHint,
      filterType: _interaction.filterType,
      filterScope: _interaction.filterScope,
      scopeType: _interaction.scopeType,
      tabId: _interaction.tabId,
      scopeId: _interaction.scopeId,
      scopeResolution: _interaction.scopeResolution,
      legacyScope: _interaction.legacyScope,
      legacyScopeId: _interaction.legacyScopeId,
      tabContextDiagnostic: _interaction.tabContextDiagnostic
    };
  }

  function __controller(_KDB, _runtime, _interaction, _options) {
    var interactionType;
    var attachContext;
    if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
      return;
    }
    if (!_interaction) {
      return;
    }
    interactionType = _interaction.interactionType;
    if (DETACH_INTERACTION_TYPES[interactionType]) {
      _syncPopupDisplay.detach(_runtime);
      return;
    }
    if (interactionType !== "open") {
      return;
    }
    if (!_dispatchFilterHandoff.ownerNeedsPopupDisplayResync(_interaction.filterType)) {
      _syncPopupDisplay.detach(_runtime);
      return;
    }
    attachContext = { lastClickedFilter: toLastClickedFilter(_interaction) };
    _syncPopupDisplay.attach(_KDB, _runtime, _options, attachContext);
  }

  return __controller;
});
