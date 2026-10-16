define(["./selectionState.js"], function (_selectionState) {
  "use strict";

  function readSelectionFromValues(_valuesArr) {
    var first = Array.isArray(_valuesArr) && _valuesArr[0] ? _valuesArr[0] : null;
    if (!first) {
      return { displayValue: "Alle", useValue: "", displaySource: "policy" };
    }
    if (first.d == null || String(first.d).trim() === "") {
      return { displayValue: null, useValue: first.u != null ? String(first.u) : "", displaySource: "unavailable" };
    }
    return {
      displayValue: String(first.d),
      useValue: first.u != null ? String(first.u) : "",
      displaySource: "cognos"
    };
  }

  function buildSelectionFields(_selection) {
    var confirmed = _selection.displayValue === null
      ? { displayValue: null, useValue: _selection.useValue, displaySource: "unavailable" }
      : _selectionState.createConfirmedSelection(_selection.displayValue, _selection.useValue);
    return {
      currentSelection: Object.assign({}, confirmed, { displaySource: _selection.displaySource }),
      backupSelection: Object.assign({}, confirmed, { displaySource: _selection.displaySource }),
      pendingSelection: _selectionState.createPendingSelection(_selection.displayValue || "Alle")
    };
  }

  function createFilterInstanceState(_descriptor, _existing) {
    var now = Date.now();
    var hostSelection = readSelectionFromValues(_descriptor.values);
    if (_existing && _existing.currentSelection &&
      _existing.currentSelection.displaySource === "unavailable" &&
      String(_existing.currentSelection.useValue || "") === hostSelection.useValue &&
      hostSelection.displayValue === hostSelection.useValue) {
      hostSelection = {
        displayValue: null,
        useValue: hostSelection.useValue,
        displaySource: "unavailable"
      };
    }
    var existing = _existing && _existing.currentSelection;
    if (existing && existing.displaySource === "table" &&
      String(existing.useValue || "") === hostSelection.useValue &&
      existing.displayValue != null &&
      String(existing.displayValue) !== String(hostSelection.displayValue)) {
      hostSelection = {
        displayValue: existing.displayValue,
        useValue: hostSelection.useValue,
        displaySource: "table"
      };
    }
    var discoveredAt = _existing && _existing.timestamps ? _existing.timestamps.discoveredAt : now;
    var base = Object.assign({}, _descriptor, {
      filterType: _descriptor.filterType || "singleSelect",
      selectionOwner: _descriptor.selectionOwner || "singleSelect",
      status: "active",
      hostStatus: "present",
      hasAlleOption: _descriptor.hasAlleOption === true,
      condition: _descriptor.condition || null,
      timestamps: {
        discoveredAt: discoveredAt,
        reconciledAt: now,
        interactionAt: _existing && _existing.timestamps ? _existing.timestamps.interactionAt : null,
        confirmedAt: _existing && _existing.timestamps ? _existing.timestamps.confirmedAt : null
      }
    });
    delete base.values;
    delete base.normalizedScopeId;
    if (base.selectionOwner !== "singleSelect") {
      return base;
    }
    var selectionFields = buildSelectionFields(hostSelection);
    if (_existing && _existing.pendingSelection) {
      selectionFields.pendingSelection = Object.assign({}, _existing.pendingSelection);
    }
    return Object.assign({}, _existing || {}, base, selectionFields, {
      isCommitInProgress: _existing ? _existing.isCommitInProgress === true : false,
      appliedInteractionSeq: _existing ? _existing.appliedInteractionSeq || 0 : 0
    });
  }

  return {
    createFilterInstanceState: createFilterInstanceState,
    readSelectionFromValues: readSelectionFromValues
  };
});
