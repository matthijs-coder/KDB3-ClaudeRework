define([
  "../hierarchySnapshot.js",
  "../../../../widgets/widgetVis/state.js"
], function (_hierarchySnapshot, _widgetVisState) {
  "use strict";

  var NOTIFY_CONTEXT_SOURCES = {
    user: true,
    startup: true,
    sicht: true,
    historyReplay: true
  };

  function normalizePayloadSource(_contextSource) {
    var source = _contextSource != null ? String(_contextSource) : "";
    if (source === "startup" || source === "sicht") {
      return "sichtDefault";
    }
    if (source === "historyReplay") {
      return "historyReplay";
    }
    return "user";
  }

  function normalizeSelectionSource(_selection, _contextSource) {
    if (!_selection) {
      return "user";
    }
    if (_selection.source === "default") {
      return "default";
    }
    if (_contextSource === "historyReplay" || _selection.source === "historyReplay") {
      return "historyReplay";
    }
    return "user";
  }

  function readEffectiveSelection(_reconcileResult) {
    var resolution = _reconcileResult && _reconcileResult.resolution ? _reconcileResult.resolution : null;
    var dominantValues;
    var pageContextValuesByScope;
    var scopeIds;
    var idx;
    var scopeValues;
    if (!resolution) {
      return { selection: null, scopeType: "global", scopeId: "global" };
    }
    dominantValues = resolution.dominantValues;
    if (Array.isArray(dominantValues) && dominantValues[0] && dominantValues[0].useValue) {
      return { selection: dominantValues[0], scopeType: "global", scopeId: "global" };
    }
    pageContextValuesByScope = resolution.pageContextValuesByScope || {};
    scopeIds = Object.keys(pageContextValuesByScope);
    for (idx = 0; idx < scopeIds.length; idx += 1) {
      scopeValues = pageContextValuesByScope[scopeIds[idx]];
      if (Array.isArray(scopeValues) && scopeValues[0] && scopeValues[0].useValue) {
        return {
          selection: scopeValues[0],
          scopeType: "pageContext",
          scopeId: scopeIds[idx]
        };
      }
    }
    return { selection: null, scopeType: "global", scopeId: "global" };
  }

  function buildPayload(_KDB, _context, _definition, _reconcileResult) {
    var context = _context || {};
    var contextSource = context.source != null ? String(context.source) : "";
    var handoff = context.viewSyncHandoff || null;
    var effective = readEffectiveSelection(_reconcileResult);
    var scopeType = effective.scopeType === "pageContext" ? "pageContext" : "global";
    var scopeId = effective.scopeId != null ? String(effective.scopeId) : "global";
    var visibleLabel = _definition.visibleFilterLabel || "Dienststelle";
    var selection = effective.selection;
    var pageScopeId;
    var hierarchySnapshot;
    if (
      !handoff ||
      handoff.filterScope === "global" ||
      handoff.scopeType === "global" ||
      handoff.scopeId == null ||
      handoff.scopeId === "" ||
      handoff.scopeId === "global"
    ) {
      pageScopeId = "active";
    } else {
      pageScopeId = String(handoff.scopeId);
    }
    hierarchySnapshot = _hierarchySnapshot.readCurrentHierarchySnapshot(_KDB, { pageScopeId: pageScopeId });
    return {
      filterId: handoff && handoff.filterId ? String(handoff.filterId) : String(scopeId) + "__" + visibleLabel,
      filterLabel: handoff && handoff.filterLabel ? String(handoff.filterLabel) : visibleLabel,
      activeFilterKey: _definition.activeFilterKey,
      visibleFilterLabel: visibleLabel,
      scopeType: scopeType,
      scopeId: scopeId,
      selection: {
        displayValue: selection.displayValue != null ? String(selection.displayValue) : "",
        useValue: String(selection.useValue),
        source: normalizeSelectionSource(selection, contextSource),
        hostDisplay: selection.hostDisplay != null && String(selection.hostDisplay) !== ""
          ? String(selection.hostDisplay)
          : ""
      },
      hierarchySnapshot: hierarchySnapshot,
      source: normalizePayloadSource(contextSource),
      observedAt: context.observedAt != null ? context.observedAt : Date.now()
    };
  }

  function dispatchWidgetChanged(_KDB, _payload) {
    var widgetVisApi = _KDB && _KDB.api ? _KDB.api.widgetVis : null;
    if (widgetVisApi && typeof widgetVisApi.dispatch === "function") {
      widgetVisApi.dispatch({
        type: _widgetVisState.ACTION_TYPES.DIENSTSTELLE_CHANGED,
        payload: _payload
      });
    }
  }

  function notifyWidgetChanged(_KDB, _context, _definition, _reconcileResult) {
    var context = _context || {};
    var contextSource = context.source != null ? String(context.source) : "";
    var effective;
    if (!_reconcileResult || !_definition || !NOTIFY_CONTEXT_SOURCES[contextSource]) {
      return;
    }
    effective = readEffectiveSelection(_reconcileResult);
    if (!effective.selection || !effective.selection.useValue) {
      return;
    }
    try {
      dispatchWidgetChanged(_KDB, buildPayload(_KDB, context, _definition, _reconcileResult));
    } catch (_error) {
      console.warn("[dienststelle.widgetVis.dispatch] boundary failed", _error);
    }
  }

  return {
    readEffectiveSelection: readEffectiveSelection,
    notifyWidgetChanged: notifyWidgetChanged
  };
});
