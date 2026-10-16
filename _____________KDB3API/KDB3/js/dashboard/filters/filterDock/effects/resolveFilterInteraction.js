define([
  "./resolveConfiguredFilterIdentity.js",
  "./readFilterIdentity.js",
  "./readClickIntent.js",
  "./readPopupSnapshot.js",
  "./readConfirmedNativeSelectLabels.js",
  "./buildFilterDockHandoff.js",
  "./syncFilterWrapperClasses.js"
], function (
  _resolveConfiguredFilterIdentity,
  _readFilterIdentity,
  _readClickIntent,
  _readPopupSnapshot,
  _readConfirmedNativeSelectLabels,
  _buildFilterDockHandoff,
  _syncFilterWrapperClasses
) {
  "use strict";

  function __controller(_KDB, _event, _selectors) {
    var target = _event && _event.target;
    if (!_KDB || !target || !_selectors) {
      return null;
    }

    var okCancelState = _readClickIntent.readOkCancelState(target, _selectors);
    if (!okCancelState) {
      return null;
    }

    var filterEl = target.closest(_selectors.filterItemSelector);
    if (!filterEl && _readClickIntent.isPopupControlClick(target, _selectors)) {
      var filterDockRuntime =
        _KDB.runtime && _KDB.runtime.filterDock ? _KDB.runtime.filterDock : null;
      filterEl =
        filterDockRuntime && filterDockRuntime.domRefs
          ? filterDockRuntime.domRefs.activeFilterEl
          : null;
    }
    if (!filterEl) {
      return null;
    }

    var identity = _resolveConfiguredFilterIdentity(_KDB, filterEl, _selectors);
    if (!identity.filterLabel) {
      return null;
    }
    if (identity.tabContextDiagnostic) {
      console.warn("[filterDock.resolveFilterInteraction] tab context diagnostic", {
        code: identity.tabContextDiagnostic,
        filterLabel: identity.filterLabel
      });
    }

    _syncFilterWrapperClasses(filterEl, identity);

    var observedAt = Date.now();
    var flags = _readClickIntent.readClickFlags(target, _selectors, okCancelState);
    var alleAndOption = _readClickIntent.resolveAlleAndOption(target, _selectors);
    var interactionType = _readClickIntent.resolveInteractionType(
      target,
      _selectors,
      flags,
      alleAndOption
    );
    var dockRoot =
      typeof document !== "undefined" ? document.querySelector(_selectors.rootSelector) : null;
    var filterDockRuntime =
      _KDB.runtime && _KDB.runtime.filterDock ? _KDB.runtime.filterDock : null;
    var confirmedLabels =
      identity.filterType === "nativeMultiSelect" && interactionType === "confirm"
        ? _readConfirmedNativeSelectLabels(filterEl, dockRoot, _selectors, filterDockRuntime)
        : null;
    var handoff = _buildFilterDockHandoff.buildHandoff({
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
      sourceElementSignature: _readFilterIdentity.buildElementSignature(target),
      popup: _readPopupSnapshot(
        filterEl,
        dockRoot,
        _selectors,
        identity.filterId,
        identity.filterType,
        observedAt,
        filterDockRuntime
      ),
      observedAt: observedAt
    });

    return _buildFilterDockHandoff.buildClickResolution(handoff, filterEl, observedAt);
  }

  return __controller;
});
