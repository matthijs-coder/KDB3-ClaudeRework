define([
  "../../../../core/utils/normalizeCognosScopeId.js",
  "../config.js",
  "./selection.js"
], function (_normalizeCognosScopeId, _config, _selectionState) {
  "use strict";

  var ALLE = _config.ALLE;

  function encodePart(_value) {
    return encodeURIComponent(String(_value == null ? "" : _value));
  }

  function toScopeType(_scopeType, _normalizedScope) {
    return _scopeType === "global" && _normalizedScope === "global" ? "global" : "pageContext";
  }

  function buildFilterInstanceId(_scopeType, _scopeId, _itemId, _fallbackLabel) {
    var normalizedScope = _normalizeCognosScopeId(_scopeId);
    var scopeType = toScopeType(_scopeType, normalizedScope);
    var prefix = scopeType === "global" ? "g" : "p";
    var scopeToken = scopeType === "global" ? "global" : normalizedScope;
    var itemId = String(_itemId == null ? "" : _itemId).trim();
    var fallbackLabel = String(_fallbackLabel == null ? "" : _fallbackLabel).trim();
    if (itemId) {
      return {
        filterInstanceId: prefix + "|s=" + encodePart(scopeToken) + "|i=" + encodePart(itemId),
        identityQuality: "itemId",
        normalizedScopeId: scopeToken
      };
    }
    return {
      filterInstanceId: prefix + "|s=" + encodePart(scopeToken) + "|l=" + encodePart(fallbackLabel),
      identityQuality: "labelFallback",
      normalizedScopeId: scopeToken
    };
  }

  function readSelectionFromValues(_valuesArr) {
    var first = Array.isArray(_valuesArr) && _valuesArr[0] ? _valuesArr[0] : null;
    if (!first) {
      return { displayValue: ALLE, useValue: "", displaySource: "policy" };
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
      pendingSelection: _selectionState.createPendingSelection(_selection.displayValue || ALLE)
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

  function readForcedSelectionLabel(_handoffContext) {
    var filterConfig = _handoffContext && _handoffContext.filterConfig;
    if (!filterConfig) {
      return null;
    }
    if (filterConfig.displayValue != null && String(filterConfig.displayValue).trim() !== "") {
      return String(filterConfig.displayValue).trim();
    }
    return null;
  }

  function readForcedSelectionUseValue(_handoffContext) {
    var filterConfig = _handoffContext && _handoffContext.filterConfig;
    if (!filterConfig || filterConfig.useValue == null) {
      return "";
    }
    return String(filterConfig.useValue).trim();
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
    if (!displayValue || displayValue.toLowerCase() === ALLE.toLowerCase()) {
      return null;
    }
    return {
      displayValue: displayValue,
      useValue: initialSelection.useValue != null ? String(initialSelection.useValue) : ""
    };
  }

  function resolveInitialSelections(_handoff) {
    var handoffHydration = readInitialSelectionFromHandoff(_handoff);
    return {
      initialDisplayValue: handoffHydration ? handoffHydration.displayValue : ALLE,
      initialUseValue: handoffHydration ? handoffHydration.useValue : ""
    };
  }

  function applyRightsForcedSelectionIfNeeded(_handoff, _filterState) {
    if (
      _handoff.filterType !== "specialSingleSelect" &&
      _filterState.wasHydratedFromRights !== true &&
      _filterState.hasAlleOption !== true &&
      _selectionState.getConfirmedDisplayValue(_filterState.currentSelection) === ALLE
    ) {
      var forcedSelectionLabel = readForcedSelectionLabel(_handoff);
      if (forcedSelectionLabel) {
        var forcedSelection = _selectionState.createConfirmedSelection(
          forcedSelectionLabel,
          readForcedSelectionUseValue(_handoff)
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

  function createDelegatedWorkingState(_handoff) {
    if (_handoff._delegatedWorkingState) { return _handoff._delegatedWorkingState; }
    var context = _handoff.ownerSelectionContext || {};
    var initial = resolveInitialSelections(_handoff);
    var current = context.currentSelection || {
      displayValue: initial.initialDisplayValue,
      useValue: initial.initialUseValue
    };
    var backup = context.backupSelection || current;
    var pending = context.pendingSelection || { displayValue: current.displayValue };
    _handoff._delegatedWorkingState = {
      currentSelection: _selectionState.normalizeConfirmedSelection(current),
      backupSelection: _selectionState.normalizeConfirmedSelection(backup),
      pendingSelection: _selectionState.normalizePendingSelection(pending),
      isCommitInProgress: false,
      hasAlleOption: false,
      condition: null,
      appliedInteractionSeq: 0
    };
    return _handoff._delegatedWorkingState;
  }

  function ensureFilterState(_KDB, _handoff) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.state.filters.singleSelect = _KDB.state.filters.singleSelect || {};

    var singleSelectRoot = _KDB.state.filters.singleSelect;
    if (!singleSelectRoot.meta) {
      singleSelectRoot.meta = { isProgrammaticClick: false };
    }
    if (!singleSelectRoot.instancesById) { singleSelectRoot.instancesById = {}; }

    var filterScope = _handoff.filterScope || _handoff.scopeType || "global";
    var filterLabel = _handoff.filterLabel;
    var filterInstanceId = _handoff.filterInstanceId;
    if (!filterInstanceId) {
      throw new Error("filterInstanceId is required before interaction state resolution");
    }
    if (_handoff.filterType === "sicht" ||
      (singleSelectRoot.instancesById[filterInstanceId] &&
        singleSelectRoot.instancesById[filterInstanceId].selectionOwner === "sicht")) {
      return createDelegatedWorkingState(_handoff);
    }

    if (!singleSelectRoot.instancesById[filterInstanceId]) {
      throw new Error("canonical filter instance is missing: " + filterInstanceId);
    }

    var filterState = singleSelectRoot.instancesById[filterInstanceId];
    filterState.filterKey =
      _handoff.filterKey || _handoff.filterId || filterScope + "__" + filterLabel;
    filterState.currentSelection = _selectionState.normalizeConfirmedSelection(
      filterState.currentSelection
    );
    filterState.backupSelection = _selectionState.normalizeConfirmedSelection(
      filterState.backupSelection
    );
    filterState.pendingSelection = _selectionState.normalizePendingSelection(
      filterState.pendingSelection
    );
    filterState.isCommitInProgress = filterState.isCommitInProgress === true;
    filterState.hasAlleOption = _handoff.hasAlleOption === true;
    filterState.condition = _handoff.condition || null;
    filterState.lastInteractionTs = Date.now();
    filterState.hostStatus = "present";
    if (filterState.timestamps) { filterState.timestamps.interactionAt = filterState.lastInteractionTs; }

    applyRightsForcedSelectionIfNeeded(_handoff, filterState);

    return filterState;
  }

  // M4 reset-by-lookup (design doc section 3.6 point 2): completion code must
  // not write a captured instance that reconcile may already have replaced.
  // This is a pure map/delegated read; it must not go through ensureFilterState,
  // which mutates hostStatus and lastInteractionTs on every lookup.
  function lookupLiveFilterState(_KDB, _handoff, _captured) {
    var root;
    var id;
    var rec;
    if (!_KDB || !_handoff) {
      return _captured;
    }
    root = _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    if (!root) {
      return _captured;
    }
    id = _handoff.filterInstanceId;
    rec = root.instancesById && id ? root.instancesById[id] : null;
    if (_handoff.filterType === "sicht" || (rec && rec.selectionOwner === "sicht")) {
      return _handoff._delegatedWorkingState || _captured;
    }
    return rec || _captured;
  }

  return {
    buildFilterInstanceId: buildFilterInstanceId,
    readSelectionFromValues: readSelectionFromValues,
    createFilterInstanceState: createFilterInstanceState,
    ensureFilterState: ensureFilterState,
    lookupLiveFilterState: lookupLiveFilterState
  };
});
