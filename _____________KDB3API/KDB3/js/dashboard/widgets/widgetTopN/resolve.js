define([
  "./state.js",
  "./results.js",
  "./helperClaim.js",
  "./helperSpec.js",
  "./helperBinding.js",
  "./helperPlacement.js",
  "./extractTopNResult.js",
  "./cleanup.js"
], function (_state, _results, _claim, _spec, _binding, _placement, _extractTopNResult, _cleanup) {
  "use strict";

  // widgetTopN/resolveRequested: claim a helper, bind and read it parked beside
  // the owner, restore it, then report the TopN values to widgetVis.
  // `op` is one operation: { context, request, opSeq, ownerRuntime, signal }. The
  // signal is the one this op started with: an explicit cleanup or a newer op of
  // the same owner aborts it, and every step re-checks it through isStale().
  async function handleResolveRequested(_context, _action) {
    var request = _state.validateResolveRequest(_action);
    if (request.ok !== true) {
      return request;
    }
    var opSeq = _context.beginOwnerOperation(request.ownerVisId, _action.opSeq);
    if (_context.isStaleOpSeq(request.ownerVisId, opSeq)) {
      return _results.staleOperation(request.ownerVisId, opSeq);
    }
    _context.dispatchInternal({ type: _state.ACTION_TYPES.MARK_PENDING, widgetId: request.ownerVisId, payload: { opSeq: opSeq } });
    var ownerRuntime = _context.readOwnerRuntime(request.ownerVisId);
    var op = {
      context: _context,
      request: request,
      opSeq: opSeq,
      ownerRuntime: ownerRuntime,
      signal: ownerRuntime.abortControllers.resolve.signal
    };
    if (_state.isDefaultTopN(request.topNChoice)) {
      return dispatchSuccess(op, [], null, null);
    }
    return runHelperResolution(op);
  }

  async function runHelperResolution(op) {
    var claim = await _claim.claimTopNHelper(op.context._KDB, buildClaimContext(op));
    if (isStale(op)) {
      return _results.staleOperation(op.request.ownerVisId, op.opSeq);
    }
    if (claim.status === "noHelperAvailable") {
      return dispatchNoHelper(op, claim);
    }
    if (claim.ok !== true) {
      return dispatchError(op, claim.errorCode || "WIDGET_TOPN_HELPER_CLAIM_FAILED", claim.errorMessage, claim.diagnostics, false, null);
    }
    op.ownerRuntime.helperWidgetId = claim.helperWidgetId;
    if (claim.claimToken) {
      op.ownerRuntime.claimToken = claim.claimToken;
    }
    return runBindingAndRead(op, claim.helperWidgetId);
  }

  async function runBindingAndRead(op, helperWidgetId) {
    var request = op.request;
    var specResult = _spec.buildTopNSpec(Object.assign({}, request, { opSeq: op.opSeq, ownerRuntime: op.ownerRuntime, helperWidgetId: helperWidgetId }));
    if (specResult.ok !== true) {
      return dispatchError(op, specResult.errorCode, specResult.errorMessage, specResult.diagnostics, false, null);
    }
    var placement = _placement.appendHelperAfterOwner(op.context._KDB, request.ownerVisId, helperWidgetId, op.ownerRuntime, op.opSeq);
    var applyResult = await _binding.runHelperBinding(op.context._KDB, buildApplyContext(op, helperWidgetId, specResult.spec));
    if (isStale(op) || applyResult.status === "aborted") {
      _placement.restoreHelperPlacement(op.context._KDB, helperWidgetId, placement, op.ownerRuntime);
      return _results.staleOperation(request.ownerVisId, op.opSeq);
    }
    if (applyResult.ok !== true) {
      _placement.restoreHelperPlacement(op.context._KDB, helperWidgetId, placement, op.ownerRuntime);
      return dispatchError(op, applyResult.errorCode, applyResult.errorMessage, applyResult.diagnostics, false, null);
    }
    writeHelperApplyRuntime(op.ownerRuntime, helperWidgetId, applyResult, specResult.spec);
    return readAndExtract(op, helperWidgetId, specResult.spec, placement);
  }

  async function readAndExtract(op, helperWidgetId, spec, placement) {
    var request = op.request;
    var readResult = await _binding.readHelperTableRows(op.context._KDB, buildReadContext(op, helperWidgetId));
    _placement.restoreHelperPlacement(op.context._KDB, helperWidgetId, placement, op.ownerRuntime);
    if (isStale(op) || readResult.status === "aborted") {
      return _results.staleOperation(request.ownerVisId, op.opSeq);
    }
    if (readResult.ok !== true) {
      return dispatchError(op, readResult.errorCode, readResult.errorMessage, readResult.diagnostics, true, spec);
    }
    var extract = _extractTopNResult(readResult.readResult, request.dataConfig, request.topNChoice, _state.readTopNOptions(request.config));
    if (extract.ok !== true) {
      return dispatchError(op, extract.errorCode, extract.errorMessage, extract.diagnostics, true, spec);
    }
    return dispatchSuccess(op, extract.resultValues, extract.excludeItemId, spec);
  }

  function buildClaimContext(op) {
    return {
      ownerVisId: op.request.ownerVisId,
      opSeq: op.opSeq,
      ownerRuntime: op.ownerRuntime,
      dispatchInternal: op.context.dispatchInternal,
      tabId: op.request.tabId || null,
      signal: op.signal
    };
  }

  function buildApplyContext(op, helperWidgetId, spec) {
    return {
      ownerVisId: op.request.ownerVisId,
      helperWidgetId: helperWidgetId,
      ownerRuntime: op.ownerRuntime,
      opSeq: op.opSeq,
      spec: spec,
      signal: op.signal,
      previousManagedFilterItemIds: op.ownerRuntime.helperManagedFilterItemIds
    };
  }

  function buildReadContext(op, helperWidgetId) {
    return {
      ownerVisId: op.request.ownerVisId,
      helperWidgetId: helperWidgetId,
      ownerRuntime: op.ownerRuntime,
      opSeq: op.opSeq,
      signal: op.signal
    };
  }

  function writeHelperApplyRuntime(ownerRuntime, helperWidgetId, applyResult, spec) {
    ownerRuntime.helperWidgetId = helperWidgetId;
    ownerRuntime.helperManagedFilterItemIds = applyResult.managedFilterItemIds || [];
    ownerRuntime.lastHelperPlan = applyResult.plan || null;
    ownerRuntime.lastHelperDataConfig = spec.dataConfig || null;
  }

  function isStale(op) {
    return op.context.isStaleOpSeq(op.request.ownerVisId, op.opSeq) || _results.isAborted(op.signal);
  }

  async function dispatchSuccess(op, resultValues, excludeItemId, spec) {
    var request = op.request;
    if (isStale(op)) {
      return _results.staleOperation(request.ownerVisId, op.opSeq);
    }
    op.context.dispatchInternal({
      type: _state.ACTION_TYPES.RESOLUTION_SUCCEEDED,
      widgetId: request.ownerVisId,
      payload: { opSeq: op.opSeq, resultValues: resultValues, excludeItemId: excludeItemId }
    });
    var terminal = await dispatchTopNResolved(op.context._KDB, buildTerminalPayload(op, "success", resultValues, excludeItemId));
    _cleanup.startPostResolutionCleanup(op.context, op, spec);
    return buildReturn(op, "success", true, terminal, null);
  }

  async function dispatchNoHelper(op, claim) {
    op.context.dispatchInternal({
      type: _state.ACTION_TYPES.NO_HELPER_AVAILABLE,
      widgetId: op.request.ownerVisId,
      payload: { errorCode: "WIDGET_TOPN_NO_HELPER_AVAILABLE", errorMessage: claim.errorMessage || null }
    });
    var terminal = await dispatchTopNResolved(
      op.context._KDB,
      buildTerminalPayload(op, "noHelperAvailable", [], null, "WIDGET_TOPN_NO_HELPER_AVAILABLE", claim.errorMessage)
    );
    return buildReturn(op, "noHelperAvailable", true, terminal, "WIDGET_TOPN_NO_HELPER_AVAILABLE");
  }

  async function dispatchError(op, errorCode, errorMessage, diagnostics, shouldCleanup, spec) {
    var request = op.request;
    if (isStale(op)) {
      return _results.staleOperation(request.ownerVisId, op.opSeq);
    }
    op.context.dispatchInternal({
      type: _state.ACTION_TYPES.ERROR_RECORDED,
      widgetId: request.ownerVisId,
      payload: { errorCode: errorCode, errorMessage: errorMessage }
    });
    var terminal = await dispatchTopNResolved(op.context._KDB, buildTerminalPayload(op, "error", [], null, errorCode, errorMessage));
    if (shouldCleanup === true) {
      _cleanup.startPostResolutionCleanup(op.context, op, spec);
    }
    return buildReturn(op, "error", false, terminal, errorCode, errorMessage, diagnostics);
  }

  function buildTerminalPayload(op, status, resultValues, excludeItemId, errorCode, errorMessage) {
    return {
      ownerVisId: op.request.ownerVisId,
      opSeq: op.opSeq,
      status: status,
      resultValues: resultValues || [],
      excludeItemId: excludeItemId || null,
      errorCode: errorCode || null,
      errorMessage: errorMessage || null
    };
  }

  function buildReturn(op, status, ok, terminal, errorCode, errorMessage, diagnostics) {
    return {
      ok: ok === true,
      ownerVisId: op.request.ownerVisId,
      opSeq: op.opSeq,
      status: status,
      terminalDispatched: terminal.terminalDispatched === true,
      errorCode: errorCode,
      errorMessage: errorMessage,
      diagnostics: diagnostics || terminal.diagnostics
    };
  }

  // Boundary for the terminal report: a missing or failing widgetVis API ends in
  // a result for the caller instead of a throw out of the resolve flow.
  async function dispatchTopNResolved(_KDB, _payload) {
    var widgetVis = _KDB.api && _KDB.api.widgetVis;
    if (!widgetVis || typeof widgetVis.dispatch !== "function") {
      return { ok: false, terminalDispatched: false, errorCode: "WIDGET_TOPN_UNAVAILABLE_DEPENDENCY" };
    }
    try {
      var result = await widgetVis.dispatch({
        type: "widgetVis/topNResolved",
        widgetId: _payload.ownerVisId,
        opSeq: _payload.opSeq,
        payload: _payload
      });
      return { ok: !!result && result.ok === true, terminalDispatched: true, diagnostics: result };
    } catch (err) {
      console.error("[widgetTopN.dispatchTopNResolved] failed", { ownerVisId: _payload.ownerVisId }, err);
      return {
        ok: false,
        terminalDispatched: false,
        errorCode: "WIDGET_TOPN_UNAVAILABLE_DEPENDENCY",
        errorMessage: _results.messageFromError(err)
      };
    }
  }

  return { handleResolveRequested: handleResolveRequested };
});
