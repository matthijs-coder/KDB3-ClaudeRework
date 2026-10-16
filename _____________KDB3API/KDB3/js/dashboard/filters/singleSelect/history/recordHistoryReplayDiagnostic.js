define([], function () {
  "use strict";

  // Failure visibility (historyService-filterInstanceIdentity-contractdelta.md
  // §5, amendment 2026-08-10): every replay failure is recorded visibly in the
  // singleSelect owner state, not only in the returned result, while the
  // history pointer itself stays unchanged (the caller never dispatches
  // undoSucceeded/redoSucceeded for a failed replay). This mirrors the
  // existing `lastDiagnostics`/`errorCode` pattern used by
  // effects/recordFilterDockDiagnostics.js and actions/reconcileRunSupport.js.

  function recordHistoryReplayDiagnostic(_KDB, _errorCode, _message, _filterInstanceId) {
    var root = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    if (!root) { return; }
    root.lastDiagnostics = (root.lastDiagnostics || []).concat([{
      code: _errorCode,
      filterInstanceId: _filterInstanceId || null,
      message: _message || _errorCode
    }]).slice(-50);
    root.errorCode = _errorCode;
    root.errorMessage = _message || _errorCode;
  }

  return recordHistoryReplayDiagnostic;
});
