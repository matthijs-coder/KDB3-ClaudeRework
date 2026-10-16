define([
  "./normalizeSingleSelectHistoryStepValue.js",
  "./resolveSingleSelectHistoryTarget.js",
  "../config.js",
  "./recordHistoryReplayDiagnostic.js",
  "../effects/replayCommittedSelection.js",
  "../../../widgets/widgetVis/actions/runTopNFilterConfirmWave.js",
  "../../../../core/config/visualizations/topNHelper.js"
], function (_stepValue, _resolveTarget, _config, _recordDiagnostic, _replayCommittedSelection, _runTopNFilterConfirmWave, _topNHelper) {
  "use strict";

  // Entry point invoked by createSingleSelectHistoryReplayHandler.js through
  // the existing _deps.replayHandlers injection (historyService-
  // filterInstanceIdentity-contractdelta.md §9). Validates the step shape,
  // resolves the one live target instance, and delegates the write/reread/
  // commit/notify/rollback to the owner effect. Returns a boolean so a failed
  // replay never advances the historyService pointer (§5, last paragraph).
  //
  // Amendment 2026-08-10: every rejection path records a visible diagnostic
  // on the singleSelect owner state (lastDiagnostics/errorCode/errorMessage)
  // before returning false; the history pointer is left untouched by the
  // caller regardless.

  function reportFailure(_KDB, _filterInstanceId, _errorCode, _message) {
    _recordDiagnostic(_KDB, _errorCode, _message, _filterInstanceId);
    return false;
  }

  async function applySingleSelectHistoryReplay(_KDB, _payload) {
    var payload = _payload || {};
    var step = payload.step || null;
    var otherValue;
    var target;
    var other;
    var resolved;
    var result;

    if (!step || step.key !== "filter_singleSelect") {
      return false;
    }
    otherValue = payload.direction === "undo" ? step.new : step.old;
    target = _stepValue.normalize(payload.targetValue);
    other = otherValue != null ? _stepValue.normalize(otherValue) : null;
    if (!target || target.invalid === true || (other && other.invalid === true)) {
      return reportFailure(_KDB, null, _config.historyReplayCodes.STEP_INVALID, "history step failed identity/shape validation");
    }
    if (other && !_stepValue.sameInstance(target, other)) {
      return reportFailure(
        _KDB, target.filterInstanceId, _config.historyReplayCodes.STEP_INVALID,
        "old/new step values reference different instances"
      );
    }
    if (target.displayValue === null && target.displaySource !== "unavailable") {
      return reportFailure(
        _KDB, target.filterInstanceId, _config.historyReplayCodes.STEP_INVALID,
        "history step failed identity/shape validation"
      );
    }

    resolved = await _resolveTarget(_KDB, target);
    if (!resolved.ok) {
      return reportFailure(_KDB, target.filterInstanceId, resolved.errorCode, "target instance unresolved");
    }

    result = await _replayCommittedSelection(_KDB, resolved.record, {
      displayValue: target.displayValue,
      useValue: target.useValue,
      displaySource: target.displaySource
    });
    if (!result || result.ok !== true) {
      if (result && result.rollbackFailed) {
        _recordDiagnostic(
          _KDB, _config.historyReplayCodes.ROLLBACK_FAILED, "replay rollback could not be verified", resolved.record.filterInstanceId
        );
      }
      return reportFailure(
        _KDB, resolved.record.filterInstanceId, (result && result.errorCode) || _config.historyReplayCodes.REPLAY_FAILED,
        "replay apply failed"
      );
    }
    startTopNWave(_KDB, resolved.record);
    return true;
  }

  function startTopNWave(_KDB, _record) {
    var table = _topNHelper.resolveTableEntry();
    var columnId = _record && _record.itemId != null ? String(_record.itemId) : "";
    if (_record.scopeType === "pageContext" && !_record.scopeId) {
      return;
    }
    try {
      Promise.resolve(_runTopNFilterConfirmWave(_KDB, {
        scopeType: _record.scopeType,
        scopeId: _record.scopeId,
        isJahr: !!(table && columnId === table.jahrColumnId),
        filterType: "singleSelect"
      })).then(null, logTopNWave);
    } catch (err) {
      logTopNWave(err);
    }
  }

  function logTopNWave(_err) {
    console.error("[singleSelect.applySingleSelectHistoryReplay] topN wave failed", _err);
  }

  return applySingleSelectHistoryReplay;
});
