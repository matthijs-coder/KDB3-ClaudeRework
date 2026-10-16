define([
  "./config.js",
  "./state/selection.js",
  "./state/selectors.js",
  "../../../core/utils/kit/history.js"
], function (_config, _selectionState, _selectors, _kitHistory) {
  "use strict";

  // Maps a raw filter_singleSelect step-side value (old or new) to a shape-
  // agnostic descriptor used for target resolution. Recognizes both the
  // identity-aware shape (historyService-filterInstanceIdentity-contractdelta.md
  // §3) and the legacy shape (§6): {filterScope, filterLabel, itemId,
  // displayValue, useValue}. Every descriptor carries `invalid` so callers can
  // reject a malformed/incomplete side with `HISTORY_STEP_INVALID` instead of
  // silently falling back (amendment 2026-08-10).

  var DISPLAY_SOURCE_ALLOWLIST = { cognos: true, table: true, policy: true, unavailable: true };

  function trimmed(_value) {
    return typeof _value === "string" ? _value.trim() : "";
  }

  function readDisplayValue(_value) {
    if (_value.displayValue === null) { return null; }
    return _value.displayValue == null ? "" : String(_value.displayValue);
  }

  function readUseValue(_value) {
    return _value.useValue == null ? "" : String(_value.useValue);
  }

  // A new-shape side always states its own displaySource; an invalid or
  // missing source is a malformed step and must reject, never be coerced
  // into "unavailable" (amendment 2026-08-10).
  function isValidDisplaySource(_source, _displayValue) {
    if (!DISPLAY_SOURCE_ALLOWLIST[_source]) { return false; }
    return _displayValue !== null || _source === "unavailable";
  }

  function normalizeNewShape(_value) {
    var filterLabel = trimmed(_value.filterLabel);
    var scopeType = _value.scopeType === "global" || _value.scopeType === "pageContext" ? _value.scopeType : "";
    var filterInstanceId = trimmed(_value.filterInstanceId);
    var itemId = _value.itemId == null || _value.itemId === "" ? null : String(_value.itemId);
    var semanticInstanceKey = trimmed(_value.semanticInstanceKey) || null;
    var displayValue = readDisplayValue(_value);
    var displaySource = trimmed(_value.displaySource);
    if (!filterLabel || !scopeType || !filterInstanceId || (itemId == null && !semanticInstanceKey)) {
      return { invalid: true };
    }
    if (!isValidDisplaySource(displaySource, displayValue)) {
      return { invalid: true };
    }
    return {
      invalid: false,
      isLegacy: false,
      filterInstanceId: filterInstanceId,
      scopeType: scopeType,
      scopeId: _value.scopeId == null ? null : String(_value.scopeId),
      scopeHint: null,
      itemId: itemId,
      semanticInstanceKey: semanticInstanceKey,
      filterLabel: filterLabel,
      displayValue: displayValue,
      useValue: readUseValue(_value),
      displaySource: displaySource
    };
  }

  // Legacy steps never carried displaySource (§6); inferring it here is the
  // documented compatibility default, not "inventing unavailable for a
  // malformed step" (that prohibition targets the new identity-aware shape).
  function inferLegacyDisplaySource(_displayValue) {
    return _displayValue === null ? "unavailable" : "cognos";
  }

  function normalizeLegacyShape(_value) {
    var filterLabel = trimmed(_value.filterLabel);
    var filterScope = trimmed(_value.filterScope);
    var displayValue;
    if (!filterLabel || !filterScope) { return { invalid: true }; }
    displayValue = readDisplayValue(_value);
    return {
      invalid: false,
      isLegacy: true,
      filterInstanceId: null,
      scopeType: filterScope === "global" ? "global" : "pageContext",
      scopeId: null,
      scopeHint: filterScope,
      itemId: _value.itemId == null || _value.itemId === "" ? null : String(_value.itemId),
      semanticInstanceKey: null,
      filterLabel: filterLabel,
      displayValue: displayValue,
      useValue: readUseValue(_value),
      displaySource: inferLegacyDisplaySource(displayValue)
    };
  }

  function looksLikeNewShape(_value) {
    if (typeof _value.filterInstanceId === "string" && _value.filterInstanceId.trim()) { return true; }
    return typeof _value.scopeType === "string" && !!_value.scopeType;
  }

  function normalizeStepValue(_value) {
    if (!_value || typeof _value !== "object") { return { invalid: true }; }
    return looksLikeNewShape(_value) ? normalizeNewShape(_value) : normalizeLegacyShape(_value);
  }

  function fieldsAgree(_leftValue, _rightValue) {
    return _leftValue == null || _rightValue == null || _leftValue === _rightValue;
  }

  // Cross-check between a step's old/new side using every identity field
  // available on both sides, not only scope+label (amendment 2026-08-10):
  // itemId, semanticInstanceKey and the legacy raw scope hint must also
  // agree wherever both sides state them.
  function sameInstance(_left, _right) {
    if (!_left || !_right || _left.invalid || _right.invalid) { return false; }
    if (_left.isLegacy !== _right.isLegacy) { return false; }
    if (_left.scopeType !== _right.scopeType || _left.filterLabel !== _right.filterLabel) { return false; }
    if (!fieldsAgree(_left.scopeId, _right.scopeId)) { return false; }
    if (!fieldsAgree(_left.itemId, _right.itemId)) { return false; }
    if (!fieldsAgree(_left.semanticInstanceKey, _right.semanticInstanceKey)) { return false; }
    if (!fieldsAgree(_left.scopeHint, _right.scopeHint)) { return false; }
    return _left.isLegacy === true || _left.filterInstanceId === _right.filterInstanceId;
  }

  // Builder per historyService-filterInstanceIdentity-contractdelta.md §3/§4:
  // both old and new carry the live identity tuple (filterInstanceId,
  // scopeType, raw scopeId, itemId, semanticInstanceKey, filterLabel) plus
  // independent displayValue/useValue/displaySource. Identity is read once
  // from the live record so old/new can never disagree on which instance
  // they describe.

  function readIdentity(_KDB, _filterInstanceId) {
    var record = _filterInstanceId ? _selectors.readFilterInstance(_KDB, _filterInstanceId) : null;
    if (!record || record.selectionOwner !== "singleSelect") {
      return null;
    }
    return {
      filterInstanceId: record.filterInstanceId,
      scopeType: record.scopeType,
      scopeId: record.scopeId,
      itemId: record.itemId == null ? null : record.itemId,
      semanticInstanceKey: record.semanticInstanceKey || null,
      filterLabel: record.filterLabel
    };
  }

  function readDisplaySource(_selection) {
    if (_selection.displaySource) { return _selection.displaySource; }
    return _selection.displayValue === null ? "unavailable" : "cognos";
  }

  function createStepValue(_identity, _confirmedSelection) {
    var selection = _selectionState.normalizeConfirmedSelection(_confirmedSelection);
    return Object.assign({}, _identity, {
      displayValue: selection.displayValue,
      useValue: selection.useValue,
      displaySource: readDisplaySource(selection)
    });
  }

  function buildCommittedStep(_KDB, _handoffContext, _oldConfirmedSelection, _newConfirmedSelection) {
    var handoff = _handoffContext || {};
    var identity = readIdentity(_KDB, handoff.filterInstanceId);
    if (!identity) {
      console.warn("[singleSelect.buildCommittedStep] no live instance for history step; step skipped", {
        filterInstanceId: handoff.filterInstanceId
      });
      return null;
    }
    return {
      key: "filter_singleSelect",
      timestamp: Date.now(),
      old: createStepValue(identity, _oldConfirmedSelection),
      new: createStepValue(identity, _newConfirmedSelection)
    };
  }

  // Generic history stays excluded for delegated Sicht and automatic special
  // policy (skipHistory: true); visible special user commits retain it
  // (singleSelect-filterInstanceIdentity-contractdelta.md §7.3/§6.1).
  function pushCommittedSelectionStep(_KDB, _handoffContext, _previousSelection, _nextSelection) {
    var step;
    if (!_handoffContext || _handoffContext.filterType === "sicht" || _handoffContext.skipHistory === true) {
      return;
    }
    step = buildCommittedStep(_KDB, _handoffContext, _previousSelection, _nextSelection);
    if (step) {
      _kitHistory.pushHistoryStep(_KDB, step);
    }
  }

  // Failure visibility (historyService-filterInstanceIdentity-contractdelta.md
  // §5, amendment 2026-08-10): every replay failure is recorded visibly in the
  // singleSelect owner state, not only in the returned result, while the
  // history pointer itself stays unchanged.
  function recordHistoryReplayDiagnostic(_KDB, _errorCode, _message, _filterInstanceId) {
    var root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    if (!root) { return; }
    root.lastDiagnostics = (root.lastDiagnostics || []).concat([{
      code: _errorCode,
      filterInstanceId: _filterInstanceId || null,
      message: _message || _errorCode
    }]).slice(-_config.DIAGNOSTICS_LIMIT);
    root.errorCode = _errorCode;
    root.errorMessage = _message || _errorCode;
  }

  return {
    normalizeStepValue: normalizeStepValue,
    sameInstance: sameInstance,
    buildCommittedStep: buildCommittedStep,
    pushCommittedSelectionStep: pushCommittedSelectionStep,
    recordHistoryReplayDiagnostic: recordHistoryReplayDiagnostic
  };
});
