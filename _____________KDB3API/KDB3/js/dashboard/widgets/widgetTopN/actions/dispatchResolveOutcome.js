define([
  "../effects/cleanupTopNHelper.js",
  "../effects/dispatchTopNResolved.js",
  "./validateResolveRequest.js"
], function (_cleanupTopNHelper, _dispatchTopNResolved, _validateResolve) {
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
    await postResolutionCleanup(_context, request, opSeq, spec);
    return buildReturn(request, opSeq, "success", true, terminal, null);
  }

  async function dispatchNoHelper(_context, request, opSeq, claim) {
    _context.dispatchInternal({
      type: _context.actionTypes.NO_HELPER_AVAILABLE,
      widgetId: request.ownerVisId,
      payload: { errorCode: "WIDGET_TOPN_NO_HELPER_AVAILABLE", errorMessage: claim.errorMessage || null }
    });
    var terminal = await _dispatchTopNResolved(_context._KDB, buildTerminalPayload(request, opSeq, "noHelperAvailable", [], null, "WIDGET_TOPN_NO_HELPER_AVAILABLE", claim.errorMessage));
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
      await postResolutionCleanup(_context, request, opSeq, spec);
    }
    return buildReturn(request, opSeq, "error", false, terminal, errorCode, errorMessage, diagnostics);
  }

  async function postResolutionCleanup(_context, request, opSeq, spec) {
    console.info("[sicht-jahr] TEMP skip helper reset", {
      ownerVisId: request && request.ownerVisId
    });
    return { ok: true, status: "skipped", diagnostics: { skippedCleanup: true, reason: "TEMP" } };
    if (!spec || _validateResolve.isDefaultTopN(request.topNChoice)) {
      return null;
    }
    var ownerRuntime = _context.readOwnerRuntime(request.ownerVisId);
    if (_context.isStaleOpSeq(request.ownerVisId, opSeq)) {
      return null;
    }
    if (_validateResolve.shouldSkipPostResolutionCleanup(request.config)) {
      return { ok: true, status: "skipped", diagnostics: { skippedCleanup: true, reason: "inspectionMode" } };
    }
    var resolveController = ownerRuntime.abortControllers ? ownerRuntime.abortControllers.resolve : null;
    return _cleanupTopNHelper({ _KDB: _context._KDB }, {
      ownerVisId: request.ownerVisId,
      helperWidgetId: ownerRuntime.helperWidgetId,
      ownerRuntime: ownerRuntime,
      opSeq: opSeq,
      signal: resolveController ? resolveController.signal : null,
      clearHelperBinding: true,
      releaseClaim: false,
      cleanupReason: "postResolution",
      helperDataConfig: spec.dataConfig,
      config: request.config
    });
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
