define([
  "../config.js",
  "../runtime.js",
  "../commit/commitSelection.js",
  "../state/instance.js",
  "../state/selection.js",
  "./popup.js"
], function (_config, _singleSelectRuntime, _commitSelection, _instance, _selectionState, _popup) {
  "use strict";

  var ALLE = _config.ALLE;

  var KNOWN_INTENTS = {
    confirm: true,
    cancel: true,
    clear: true,
    close: true,
    alle: true,
    option: true,
    open: true,
    unknown: true
  };

  function resolveFromInteractionType(_context) {
    var interactionType = _context && _context.interactionType ? String(_context.interactionType) : "unknown";
    if (_context.isAlleOption === true) {
      return { type: "alle", optionLabel: ALLE };
    }
    if (KNOWN_INTENTS[interactionType]) {
      return { type: interactionType, optionLabel: _context.optionLabel || null };
    }
    return { type: "unknown", optionLabel: null };
  }

  function resolveFromClickedFlags(_context) {
    if (_context.clickedOk) {
      return { type: "confirm", optionLabel: null };
    }
    if (_context.clickedCancel) {
      return { type: "cancel", optionLabel: null };
    }
    if (_context.clickedClear) {
      return { type: "clear", optionLabel: null };
    }
    if (_context.clickedClose) {
      return { type: "close", optionLabel: null };
    }
    if (_context.isAlleOption === true) {
      return { type: "alle", optionLabel: ALLE };
    }
    return { type: "open", optionLabel: _context.optionLabel || null };
  }

  function deriveInteractionIntent(_context) {
    if (!_context) {
      return { type: "unknown", optionLabel: null };
    }
    if (_context.interactionType) {
      return resolveFromInteractionType(_context);
    }
    return resolveFromClickedFlags(_context);
  }

  function setPendingSelection(_filterState, _selectionLabel) {
    _filterState.pendingSelection = _selectionState.createPendingSelection(_selectionLabel || ALLE);
  }

  function applyPendingSelection(_handoffContext, _filterState, _intent) {
    if (!_handoffContext || !_filterState || !_intent) {
      return;
    }

    if (_intent.type === "clear" || _intent.type === "alle") {
      if (_handoffContext.hasAlleOption === true) {
        setPendingSelection(_filterState, ALLE);
      }
      return;
    }

    if (_intent.type !== "option") {
      return;
    }

    var optionLabel = _intent.optionLabel ? String(_intent.optionLabel).trim() : "";
    if (!optionLabel && _handoffContext.optionLabel) {
      optionLabel = String(_handoffContext.optionLabel).trim();
    }
    if (!optionLabel) {
      console.warn("[singleSelect.applyPending] missing optionLabel", {
        intentType: _intent.type,
        handoffOptionLabel: _handoffContext.optionLabel
      });
      return;
    }

    if (
      optionLabel === _selectionState.getPendingDisplayValue(_filterState.pendingSelection) &&
      _handoffContext.hasAlleOption === true
    ) {
      setPendingSelection(_filterState, ALLE);
      return;
    }

    setPendingSelection(_filterState, optionLabel);
  }

  function revertToBackupSelection(_filterState) {
    if (!_filterState) {
      return ALLE;
    }
    var selectionLabel = _selectionState.getConfirmedDisplayValue(_filterState.backupSelection);
    _filterState.pendingSelection = _selectionState.createPendingSelection(selectionLabel);
    return selectionLabel;
  }

  function isSelectionChangeIntent(_intentType) {
    return _intentType === "clear" || _intentType === "alle" || _intentType === "option";
  }

  function hasUnsavedPendingSelection(_filterState) {
    if (!_filterState) {
      return false;
    }
    return (
      _selectionState.getPendingDisplayValue(_filterState.pendingSelection) !==
      _selectionState.getConfirmedDisplayValue(_filterState.backupSelection)
    );
  }

  function buildPopupReadyInteractionOptions(_options, _filterState) {
    var interactionOptions = Object.assign({}, _options);
    interactionOptions.filterState = _filterState;
    interactionOptions.skipDomHydrate = hasUnsavedPendingSelection(_filterState);
    interactionOptions.forceFreshPopupMount = true;
    return interactionOptions;
  }

  function invokeOriginalCancelClick(_KDB, _handoffContext, _options) {
    var singleSelectRoot = _KDB.state.filters.singleSelect;
    try {
      singleSelectRoot.meta.isProgrammaticClick = true;
      _popup.requestOriginalButtonClick(_KDB, _handoffContext, "cancelClickable", _options);
    } finally {
      singleSelectRoot.meta.isProgrammaticClick = false;
    }
  }

  async function runInteraction(_KDB, _runtime, _handoffContext, _options) {
    var options = _options || {};
    var singleSelectRoot = _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    var filterState;
    var interactionOptions;
    var intent;
    if (!singleSelectRoot || singleSelectRoot.meta.isProgrammaticClick === true) {
      return;
    }

    filterState = _instance.ensureFilterState(_KDB, _handoffContext);
    interactionOptions = Object.assign({}, options);
    interactionOptions.filterState = filterState;

    if (options.actionType === _config.actions.FILTER_DOCK_POPUP_READY) {
      interactionOptions = buildPopupReadyInteractionOptions(options, filterState);
      await _popup.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      return;
    }

    intent = deriveInteractionIntent(_handoffContext);
    if (filterState.isCommitInProgress === true ||
      _singleSelectRuntime.inFlight.isActive(_runtime, _handoffContext.filterInstanceId)) {
      return;
    }

    if (isSelectionChangeIntent(intent.type)) {
      if (_singleSelectRuntime.isStaleInteraction(filterState, options.interactionSequence)) {
        return;
      }
      applyPendingSelection(_handoffContext, filterState, intent);
      _singleSelectRuntime.markInteractionApplied(filterState, options.interactionSequence);
      interactionOptions.skipDomHydrate = true;
      interactionOptions.forceFreshPopupMount = true;
      await _popup.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      return;
    }

    if (intent.type === "confirm") {
      if (_singleSelectRuntime.isStaleInteraction(filterState, options.interactionSequence)) {
        return;
      }
      interactionOptions.skipDomHydrate = true;
      await _popup.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      await _commitSelection.commitConfirmedSelection(_KDB, _runtime, _handoffContext, filterState, options);
      return;
    }
    if (intent.type === "cancel") {
      revertToBackupSelection(filterState);
      await _popup.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      invokeOriginalCancelClick(_KDB, _handoffContext, options);
      _popup.requestClosePopup(_KDB, options);
      return;
    }
    if (intent.type === "close") {
      revertToBackupSelection(filterState);
      await _popup.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
      return;
    }
    await _popup.restorePopupSelection(_KDB, _runtime, _handoffContext, filterState, interactionOptions);
  }

  return {
    deriveInteractionIntent: deriveInteractionIntent,
    applyPendingSelection: applyPendingSelection,
    revertToBackupSelection: revertToBackupSelection,
    runInteraction: runInteraction
  };
});
