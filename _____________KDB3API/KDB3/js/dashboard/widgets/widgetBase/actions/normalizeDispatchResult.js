define([], function () {
  function normalizeDispatchResult(_result) {
    const result = _result || {};
    const normalized = {
      ok: result.ok === true,
      outcome: result.outcome,
      reason: result.reason,
      widgetId: result.widgetId,
      opSeq: result.opSeq,
      skipped: readSkipped(result),
      routed: readCount(result.routed),
      failed: readCount(result.failed),
      stale: result.stale === true,
      rolledBack: result.rolledBack === true,
      placement: result.placement,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      reasonCode: result.reasonCode
    };
    if (result.isEligibleListEmpty === true) {
      normalized.isEligibleListEmpty = true;
    }
    return normalized;
  }
  function readSkipped(result) {
    if (result.skipped === true) {
      return true;
    }

    if (isAggregateResult(result)) {
      return readCount(result.skipped);
    }

    return false;
  }
  function isAggregateResult(result) {
    return Object.prototype.hasOwnProperty.call(result, "routed") || Object.prototype.hasOwnProperty.call(result, "failed");
  }
  function readCount(value) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }
  return normalizeDispatchResult;
});
