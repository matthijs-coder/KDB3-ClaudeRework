define(["./mapFilterDockHandoff.js", "./delegateToSingleSelect.js"], function (_mapFilterDockHandoff, _delegateToSingleSelect) {
  "use strict";

  function buildOwnerAck(_ok, _code, _message) {
    return { ok: _ok === true, acknowledged: _ok === true, degraded: false, disposed: false, errorCode: _ok === true ? null : (_code || "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED"), errorMessage: _ok === true ? null : (_message || null) };
  }
  function isTargetMatch(_entry, _target) {
    var id = _entry && _entry.filterId;
    return !!id && !!_target && (id === _target.filterId || id === _target.semanticSpecialFilterId);
  }
  function reduceCommittedPayload(_normalizedPayload) {
    if (!_normalizedPayload || !_normalizedPayload.filterId || !_normalizedPayload.filterInstanceId) { return null; }
    if (_normalizedPayload.displayValue == null || _normalizedPayload.useValue == null) { return null; }
    return { filterId: _normalizedPayload.filterId, semanticSpecialFilterId: _normalizedPayload.semanticSpecialFilterId || _normalizedPayload.filterId, filterInstanceId: _normalizedPayload.filterInstanceId, displayValue: _normalizedPayload.displayValue, useValue: _normalizedPayload.useValue };
  }
  function findTargetResult(_results, _target) {
    var results = Array.isArray(_results) ? _results : [];
    for (var idx = 0; idx < results.length; idx += 1) { if (isTargetMatch(results[idx], _target)) { return results[idx]; } }
    return null;
  }
  function buildTargetFailureAck(_syncAck, _targetResult, _target, _missingTarget) {
    var diagnostics = Array.isArray(_syncAck.diagnostics) ? _syncAck.diagnostics.slice() : [];
    var firstTargetDiagnostic = diagnostics.filter(function (_entry) { return isTargetMatch(_entry, _target); })[0] || {};
    var aborted = (_missingTarget && _syncAck && _syncAck.aborted === true) || (_targetResult && (_targetResult.aborted === true || _targetResult.superseded === true));
    var disposed = (_missingTarget && _syncAck && _syncAck.disposed === true) || (_targetResult && _targetResult.disposed === true);
    var errorCode = _missingTarget ? "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED" : (_targetResult.errorCode || firstTargetDiagnostic.code || _syncAck.errorCode || "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED");
    var errorMessage = _missingTarget ? "target special filter result missing from sync results" : (_targetResult.errorMessage || firstTargetDiagnostic.message || _syncAck.errorMessage || "target special filter sync failed");
    if (aborted) { errorCode = errorCode || "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED"; errorMessage = "target special filter sync aborted before owner ack"; }
    if (disposed) { errorCode = errorCode || "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED"; errorMessage = _syncAck.errorMessage || "specialSingleSelect owner disposed during sync"; }
    return { ok: false, acknowledged: false, degraded: true, disposed: disposed === true, retryable: aborted === true || _missingTarget === true, errorCode: errorCode, errorMessage: errorMessage, diagnostics: diagnostics };
  }
  function buildTargetScopedAck(_syncResult, _target) {
    try {
      var result = _syncResult || {};
      var diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics.slice() : [];
      var first = diagnostics[0] || {};
      var syncAck = {
        ok: result.ok === true,
        acknowledged: result.ok === true && result.degraded !== true,
        degraded: result.degraded === true || result.ok !== true,
        disposed: result.disposed === true,
        aborted: result.aborted === true,
        retryable: result.retryable === true,
        errorCode: result.ok === true ? null : (first.code || "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED"),
        errorMessage: result.ok === true ? null : (first.message || "specialSingleSelect sync failed"),
        diagnostics: diagnostics
      };
      var targetResult = findTargetResult(result.results, _target);
      var missingTarget = !targetResult;
      if (missingTarget || targetResult.ok !== true || targetResult.aborted === true || targetResult.disposed === true || targetResult.superseded === true) { return buildTargetFailureAck(syncAck, targetResult, _target, missingTarget); }
      var unrelatedDiagnostics = diagnostics.filter(function (_entry) { return !isTargetMatch(_entry, _target); });
      return { ok: true, acknowledged: true, degraded: syncAck.degraded === true || unrelatedDiagnostics.length > 0, disposed: targetResult.disposed === true, retryable: syncAck.retryable === true || unrelatedDiagnostics.length > 0, errorCode: null, errorMessage: null, diagnostics: diagnostics };
    } catch (_error) {
      console.error("[specialSingleSelect.buildTargetScopedAck] failed", _error);
      return buildOwnerAck(false, "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED", "target-scoped owner ack evaluation failed");
    }
  }
  function reduceCommittedPayloadSafe(_normalizedPayload) {
    try { return reduceCommittedPayload(_normalizedPayload); }
    catch (_error) { console.error("[specialSingleSelect.reduceCommittedPayload] failed", _error); return null; }
  }
  function handleFilterDockHandoff(_controller, _rawPayload, _actionType) {
    try {
      var mappedHandoff = _mapFilterDockHandoff(_rawPayload);
      if (!mappedHandoff || mappedHandoff.filterType !== "specialSingleSelect" || _controller.isDisposed) { return; }
      var filterId = mappedHandoff.filterId;
      var filterState = _controller._KDB.state.filters.specialSingleSelect.byFilterId[filterId];
      if (!filterState || filterState.isVisible !== true) { return; }
      _delegateToSingleSelect.delegateToSingleSelect(_controller._KDB, mappedHandoff, _actionType, filterState.alleAllowed === true);
    } catch (_error) {
      console.error("[specialSingleSelect.handleFilterDockHandoff] failed", _error);
    }
  }
  return { buildOwnerAck: buildOwnerAck, buildTargetScopedAck: buildTargetScopedAck, reduceCommittedPayload: reduceCommittedPayloadSafe, handleFilterDockHandoff: handleFilterDockHandoff };
});
