define(["./selectionState.js"], function (_selectionState) {
  "use strict";

  function getForcedSelectionLabel(_handoffContext) {
    var filterConfig = _handoffContext && _handoffContext.filterConfig;
    if (!filterConfig) {
      return null;
    }
    if (filterConfig.displayValue != null && String(filterConfig.displayValue).trim() !== "") {
      return String(filterConfig.displayValue).trim();
    }
    return null;
  }

  function readInitialSelectionFromHandoff(_handoff) {
    var filterConfig = _handoff && _handoff.filterConfig;
    var initialSelection = filterConfig && filterConfig.initialSelection;
    var displayValue;
    if (!initialSelection || typeof initialSelection !== "object") {
      return null;
    }
    displayValue =
      initialSelection.displayValue != null ? String(initialSelection.displayValue).trim() : "";
    if (!displayValue || displayValue.toLowerCase() === "alle") {
      return null;
    }
    return {
      displayValue: displayValue,
      useValue: initialSelection.useValue != null ? String(initialSelection.useValue) : ""
    };
  }

  function getForcedSelectionUseValue(_handoffContext) {
    var filterConfig = _handoffContext && _handoffContext.filterConfig;
    if (!filterConfig || filterConfig.useValue == null) {
      return "";
    }
    return String(filterConfig.useValue).trim();
  }

  function resolveInitialSelections(_KDB, _handoff) {
    var handoffHydration = readInitialSelectionFromHandoff(_handoff);
    return {
      initialDisplayValue: handoffHydration ? handoffHydration.displayValue : "Alle",
      initialUseValue: handoffHydration ? handoffHydration.useValue : ""
    };
  }

  function applyRightsForcedSelectionIfNeeded(_handoff, _filterState) {
    if (
      _handoff.filterType !== "specialSingleSelect" &&
      _filterState.wasHydratedFromRights !== true &&
      _filterState.hasAlleOption !== true &&
      _selectionState.getConfirmedDisplayValue(_filterState.currentSelection) === "Alle"
    ) {
      var forcedSelectionLabel = getForcedSelectionLabel(_handoff);
      if (forcedSelectionLabel) {
        var forcedSelection = _selectionState.createConfirmedSelection(
          forcedSelectionLabel,
          getForcedSelectionUseValue(_handoff)
        );
        _filterState.currentSelection = forcedSelection;
        _filterState.pendingSelection = _selectionState.createPendingSelection(forcedSelectionLabel);
        _filterState.backupSelection = _selectionState.createConfirmedSelection(
          forcedSelection.displayValue,
          forcedSelection.useValue
        );
        _filterState.wasHydratedFromRights = true;
      }
    }
  }

  return {
    resolveInitialSelections: resolveInitialSelections,
    applyRightsForcedSelectionIfNeeded: applyRightsForcedSelectionIfNeeded
  };
});
