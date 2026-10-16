define([
  "../effects/cleanupTopNHelper.js",
  "../effects/dispatchTopNResolved.js",
  "./validateResolveRequest.js"
], function (_cleanup, _dispatchTopNResolved, _validateResolve) {
  "use strict";

  async function dispatchSuccess(_context, request, opSeq, resultValues, excludeItemId, spec) {
    if (_context.isStaleOpSeq(request.ownerVisId, opSeq)) {
      return stale(request.ownerVisId, opSeq);
    }
    _context.dispatchInternal({
      type: _context.actionTypes.RESOLUTION_SUCCEEDED,
      widgetId: request.ownerVisId,
      payload: { opSeq: opSeq, resultValues: resultValues, excludeItemId: excludeItemId }
    });
    var terminal = await _dispatchTopNResolved(_context._KDB, buildTerminalPayload(request, opSeq, "success", resultValues, excludeItemId));
    startPostResolutionCleanup(_context, request, opSeq, spec);
    return buildReturn(request, opSeq, "success", true, terminal, null);
  }

  async function dispatchNoHelper(_context, request, opSeq, claim) {
    _context.dispatchInternal({
      type: _context.actionTypes.NO_HELPER_AVAILABLE,
      widgetId: request.ownerVisId,
      payload: { errorCode: "WIDGET_TOPN_NO_HELPER_AVAILABLE", errorMessage: claim.errorMessage || null }
    });
    var terminal = await _dispatchTopNResolved(
      _context._KDB,
      buildTerminalPayload(request, opSeq, "noHelperAvailable", [], null, "WIDGET_TOPN_NO_HELPER_AVAILABLE", claim.errorMessage)
    );
    return buildReturn(request, opSeq, "noHelperAvailable", true, terminal, "WIDGET_TOPN_NO_HELPER_AVAILABLE");
  }

  async function dispatchError(_context, request, opSeq, errorCode, errorMessage, diagnostics, shouldCleanup, spec) {
    if (_context.isStaleOpSeq(request.ownerVisId, opSeq)) {
      return stale(request.ownerVisId, opSeq);
    }
    _context.dispatchInternal({
      type: _context.actionTypes.ERROR_RECORDED,
      widgetId: request.ownerVisId,
      payload: { errorCode: errorCode, errorMessage: errorMessage }
    });
    var terminal = await _dispatchTopNResolved(_context._KDB, buildTerminalPayload(request, opSeq, "error", [], null, errorCode, errorMessage));
    if (shouldCleanup === true) {
      startPostResolutionCleanup(_context, request, opSeq, spec);
    }
    return buildReturn(request, opSeq, "error", false, terminal, errorCode, errorMessage, diagnostics);
  }

  // The owner's outcome is returned before the helper cleanup finishes, so the
  // visible chart does not wait for the cleanup render of the hidden helper.
  // The owner keeps its claim; the next claimant of this helper aborts and
  // awaits this cleanup before it touches the helper (runExclusiveHelperCleanup).
  function startPostResolutionCleanup(_context, request, opSeq, spec) {
    if (!spec || _validateResolve.isDefaultTopN(request.topNChoice)) {
      return;
    }
    var ownerRuntime = _context.readOwnerRuntime(request.ownerVisId);
    var resolveController = ownerRuntime.abortControllers ? ownerRuntime.abortControllers.resolve : null;
    if (_context.isStaleOpSeq(request.ownerVisId, opSeq) || !resolveController || resolveController.signal.aborted) {
      return;
    }
    if (!ownerRuntime.helperWidgetId || ownerRuntime.helperWidgetId !== spec.widgetId) {
      return;
    }
    if (_validateResolve.shouldSkipPostResolutionCleanup(request.config)) {
      return;
    }
    var helperWidgetId = ownerRuntime.helperWidgetId;
    _cleanup.runExclusiveHelperCleanup({ _KDB: _context._KDB }, {
      ownerVisId: request.ownerVisId,
      helperWidgetId: helperWidgetId,
      ownerRuntime: ownerRuntime,
      opSeq: opSeq,
      clearHelperBinding: true,
      releaseClaim: false,
      cleanupReason: "postResolution",
      helperDataConfig: spec.dataConfig,
      config: request.config
    }).then(
      warnIfCleanupFailed.bind(null, request.ownerVisId, helperWidgetId, opSeq),
      logCleanupError.bind(null, request.ownerVisId, helperWidgetId, opSeq)
    );
  }

  function warnIfCleanupFailed(ownerVisId, helperWidgetId, opSeq, cleanup) {
    if (cleanup && cleanup.ok !== true && cleanup.status !== "aborted") {
      console.warn("[widgetTopN.postResolutionCleanup] cleanup failed", {
        ownerVisId: ownerVisId,
        helperWidgetId: helperWidgetId,
        opSeq: opSeq,
        errorCode: cleanup.errorCode || null,
        errorMessage: cleanup.errorMessage || null
      });
    }
  }

  function logCleanupError(ownerVisId, helperWidgetId, opSeq, err) {
    console.error("[widgetTopN.postResolutionCleanup] failed", { ownerVisId: ownerVisId, helperWidgetId: helperWidgetId, opSeq: opSeq }, err);
  }

  function buildTerminalPayload(request, opSeq, status, resultValues, excludeItemId, errorCode, errorMessage) {
    return {
      ownerVisId: request.ownerVisId,
      opSeq: opSeq,
      status: status,
      resultValues: resultValues || [],
      excludeItemId: excludeItemId || null,
      errorCode: errorCode || null,
      errorMessage: errorMessage || null
    };
  }

  function buildReturn(request, opSeq, status, ok, terminal, errorCode, errorMessage, diagnostics) {
    return {
      ok: ok === true,
      ownerVisId: request.ownerVisId,
      opSeq: opSeq,
      status: status,
      terminalDispatched: terminal && terminal.terminalDispatched === true,
      errorCode: errorCode,
      errorMessage: errorMessage,
      diagnostics: diagnostics || terminal && terminal.diagnostics
    };
  }

  function stale(ownerVisId, opSeq) {
    return { ok: false, ownerVisId: ownerVisId, opSeq: opSeq, status: "aborted", stale: true, errorCode: "WIDGET_TOPN_STALE_OPERATION" };
  }

  return {
    dispatchSuccess: dispatchSuccess,
    dispatchNoHelper: dispatchNoHelper,
    dispatchError: dispatchError,
    stale: stale
  };
});
