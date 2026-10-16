define(["../state/selectionState.js"], function (_selectionState) {
  "use strict";

  function setSelection(_filterState, _selectionLabel) {
    _filterState.pendingSelection = _selectionState.createPendingSelection(_selectionLabel || "Alle");
  }

  function __controller(_handoffContext, _filterState, _intent) {
    if (!_handoffContext || !_filterState || !_intent) {
      return;
    }

    if (_intent.type === "clear" || _intent.type === "alle") {
      if (_handoffContext.hasAlleOption === true) {
        setSelection(_filterState, "Alle");
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
      setSelection(_filterState, "Alle");
      return;
    }

    setSelection(_filterState, optionLabel);
  }

  return __controller;
});
