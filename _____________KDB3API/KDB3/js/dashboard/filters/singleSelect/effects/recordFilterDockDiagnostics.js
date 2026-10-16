define([], function () {
  "use strict";

  function buildHandoffFailure(_handoffContext, _error) {
    try {
      var ownerDelegated = _handoffContext &&
        (_handoffContext.filterType === "sicht" ||
          _handoffContext.filterType === "specialSingleSelect");
      return {
        ok: false,
        code: ownerDelegated
          ? "SINGLE_SELECT_OWNER_SELECTION_INVALID"
          : "SINGLE_SELECT_INSTANCE_NOT_FOUND",
        filterInstanceId: _handoffContext &&
          _handoffContext.filterInstanceId || null,
        message: String(_error && _error.message ? _error.message : _error)
      };
    } catch (error) {
      console.error("[singleSelect.recordFilterDockDiagnostics] build failure failed", error);
      return {
        ok: false,
        code: "SINGLE_SELECT_INSTANCE_NOT_FOUND",
        filterInstanceId: null,
        message: "filterDock handoff failure could not be normalized"
      };
    }
  }

  function appendDiagnostic(_root, _diagnostic) {
    if (!_root) { return; }
    _root.lastDiagnostics = (_root.lastDiagnostics || []).concat([_diagnostic]).slice(-50);
  }

  function appendHandoffFailure(_KDB, _failure) {
    try {
      var root = _KDB && _KDB.state && _KDB.state.filters
        ? _KDB.state.filters.singleSelect : null;
      appendDiagnostic(root, {
        code: _failure.code,
        filterInstanceId: _failure.filterInstanceId,
        message: _failure.message
      });
    } catch (error) {
      console.error("[singleSelect.recordFilterDockDiagnostics] append handoff failure failed", error);
      throw error;
    }
  }

  function recordResolutionFailure(_root, _resolved) {
    try {
      var failure = {
        ok: false,
        code: _resolved && _resolved.code ||
          "SINGLE_SELECT_INSTANCE_NOT_FOUND",
        message: _resolved && _resolved.message ||
          "interaction instance resolution failed"
      };
      appendDiagnostic(_root, {
        code: failure.code,
        message: failure.message
      });
      return failure;
    } catch (error) {
      console.error("[singleSelect.recordFilterDockDiagnostics] record resolution failure failed", error);
      throw error;
    }
  }

  function recordDraftFailure(_root, _draftResult) {
    try {
      appendDiagnostic(_root, {
        code: _draftResult.code,
        message: _draftResult.message
      });
    } catch (error) {
      console.error("[singleSelect.recordFilterDockDiagnostics] record draft failure failed", error);
      throw error;
    }
  }

  return {
    buildHandoffFailure: buildHandoffFailure,
    appendHandoffFailure: appendHandoffFailure,
    recordResolutionFailure: recordResolutionFailure,
    recordDraftFailure: recordDraftFailure
  };
});
