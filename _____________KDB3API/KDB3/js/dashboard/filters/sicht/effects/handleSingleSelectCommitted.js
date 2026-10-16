define([
  "./validateSingleSelectCommitPayload.js",
  "./claimDelegatedOperationId.js",
  "./mapCommitSourceFlags.js",
  "./commitConfirmedSicht.js",
  "./dispatchSichtError.js",
  "./isDelegatedSichtCommitSource.js"
], function (
  _validatePayload,
  _claimDelegatedOperationId,
  _mapCommitSourceFlags,
  _commitConfirmedSicht,
  _dispatchSichtError,
  _isDelegatedSource
) {
  "use strict";

  // Sole entry point for confirmed singleSelect commits, whether delivered from
  // an interactive popup confirm or from a delegated applyOwnerSelection
  // (startup/restore/historyReplay). Returns a structured ack singleSelect awaits.
  async function handleSingleSelectCommitted(_KDB, _runtime, _dispatchInternal, _payload) {
    try {
      var payload = _payload || {};
      var operationId = payload.operationId ? String(payload.operationId) : "";
      var opClaim = _claimDelegatedOperationId.inspect(_runtime, operationId);
      var validation;
      var flags;
      var settled;
      var diagnostics;
      if (!operationId && _isDelegatedSource(payload.source)) {
        _dispatchSichtError(
          _dispatchInternal,
          "SICHT_OPERATION_ID_INVALID",
          "delegated singleSelect commit requires operationId"
        );
        return {
          ok: false,
          code: "SICHT_OPERATION_ID_INVALID",
          message: "delegated singleSelect commit requires operationId"
        };
      }
      if (opClaim.isDuplicate === true) {
        if (opClaim.entry.filterInstanceId &&
          opClaim.entry.filterInstanceId !== payload.filterInstanceId) {
          _dispatchSichtError(
            _dispatchInternal,
            "SICHT_INSTANCE_INVALID",
            "operationId was reused for another Sicht instance"
          );
          return {
            ok: false,
            code: "SICHT_INSTANCE_INVALID",
            message: "operationId was reused for another Sicht instance"
          };
        }
        return {
          ok: true,
          code: opClaim.isInFlight
            ? "SICHT_COMMIT_IN_FLIGHT" : "SICHT_COMMIT_STALE",
          message: opClaim.isInFlight
            ? "delegated operationId is already committing"
            : "duplicate delegated operationId ignored"
        };
      }
      validation = _validatePayload(_KDB, payload, opClaim.entry);
      if (validation.ok !== true) {
        _dispatchSichtError(
          _dispatchInternal,
          validation.code,
          validation.message
        );
        return { ok: false, code: validation.code, message: validation.message };
      }
      if (operationId &&
        !_claimDelegatedOperationId.beginCommit(_runtime, payload)) {
        return {
          ok: false,
          code: "SICHT_OPERATION_CLAIM_FAILED",
          message: "operationId could not enter commit state"
        };
      }
      flags = _mapCommitSourceFlags(payload.source);
      var commitResult = await _commitConfirmedSicht(_KDB, _dispatchInternal, {
        filterInstanceId: String(payload.filterInstanceId),
        selection: validation.selection,
        timestamp: payload.timestamp != null
          ? payload.timestamp
          : (payload.observedAt != null ? payload.observedAt : Date.now()),
        isStartupDefault: flags.isStartupDefault,
        isHistoryReplay: flags.isHistoryReplay,
        isParameterClear: validation.isClear === true,
        skipHistory: payload.skipHistory === true,
        skipDownstreamVisibility: flags.skipDownstreamVisibility
      });
      settled = !operationId || _claimDelegatedOperationId.markCommitted(
        _runtime,
        operationId,
        String(payload.filterInstanceId)
      );
      diagnostics = (commitResult.diagnostics || []).slice();
      if (!operationId) {
        diagnostics.push({
          code: "SICHT_OPERATION_ID_COMPATIBILITY",
          message: "interactive commit accepted without operationId"
        });
      }
      if (!settled) {
        diagnostics.push({
          code: "SICHT_OPERATION_SETTLE_FAILED",
          message: "operationId could not be marked committed"
        });
      }
      return {
        ok: true,
        degraded: commitResult.degraded === true ||
          !settled || !operationId,
        diagnostics: diagnostics
      };
    } catch (error) {
      _claimDelegatedOperationId.abandon(
        _runtime,
        _payload && _payload.operationId
      );
      console.error("[sicht.handleSingleSelectCommitted] failed", error);
      _dispatchSichtError(
        _dispatchInternal,
        "SICHT_COMMIT_FAILED",
        String(error && error.message ? error.message : error)
      );
      return {
        ok: false,
        code: "SICHT_COMMIT_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  return handleSingleSelectCommitted;
});
