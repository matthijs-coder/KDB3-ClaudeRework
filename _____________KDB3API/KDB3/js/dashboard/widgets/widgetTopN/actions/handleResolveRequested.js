define([
  "../effects/claimTopNHelper.js",
  "../effects/buildHelperBindingSpec.js",
  "../effects/runHelperBinding.js",
  "../effects/readHelperTableRows.js",
  "../effects/extractTopNResult.js",
  "../effects/placeHelperAfterOwner.js",
  "./validateResolveRequest.js",
  "./dispatchResolveOutcome.js",
  "../effects/effectResultHelpers.js"
], function (
  _claimTopNHelper,
  _buildHelperBindingSpec,
  _runHelperBinding,
  _readHelperTableRows,
  _extractTopNResult,
  _placeHelper,
  _validateResolve,
  _outcome,
  _helpers
) {
  "use strict";

  async function __controller(_context, _action) {
    try {
      var request = _validateResolve.validateResolveRequest(_action);
      if (request.ok !== true) {
        return request;
      }
      var opSeq = _context.beginOwnerOperation(request.ownerVisId, _action.opSeq);
      if (_context.isStaleOpSeq(request.ownerVisId, opSeq)) { return _outcome.stale(request.ownerVisId, opSeq); }
      _context.dispatchInternal({ type: _context.actionTypes.MARK_PENDING, widgetId: request.ownerVisId, payload: { opSeq: opSeq } });
      if (_validateResolve.isDefaultTopN(request.topNChoice)) {
        return await _outcome.dispatchSuccess(_context, request, opSeq, [], null, null);
      }
      return await runHelperResolution(_context, request, opSeq);
    } catch (err) {
      console.error("[widgetTopN.handleResolveRequested] failed", { widgetId: _action && _action.widgetId }, err);
      return { ok: false, status: "error", errorCode: "WIDGET_TOPN_INVALID_REQUEST", errorMessage: _helpers.messageFromError(err) };
    }
  }

  async function runHelperResolution(_context, request, opSeq) {
    var ownerRuntime = _context.readOwnerRuntime(request.ownerVisId);
    var claim = await Promise.resolve(_claimTopNHelper({ _KDB: _context._KDB }, buildClaimContext(_context, request, opSeq, ownerRuntime)));
    if (isStale(_context, request.ownerVisId, opSeq, ownerRuntime)) {
      return _outcome.stale(request.ownerVisId, opSeq);
    }
    if (claim.status === "noHelperAvailable") {
      return await _outcome.dispatchNoHelper(_context, request, opSeq, claim);
    }
    if (claim.ok !== true) {
      return await _outcome.dispatchError(_context, request, opSeq, claim.errorCode || "WIDGET_TOPN_HELPER_CLAIM_FAILED", claim.errorMessage, claim.diagnostics, false, null);
    }
    writeHelperClaim(_context, request.ownerVisId, claim.helperWidgetId, claim.claimToken);
    return await runBindingAndRead(_context, request, opSeq, ownerRuntime, claim.helperWidgetId);
  }

  async function runBindingAndRead(_context, request, opSeq, ownerRuntime, helperWidgetId) {
    var specResult = _buildHelperBindingSpec(buildSpecContext(request, opSeq, ownerRuntime, helperWidgetId));
    var helperPlacement;
    if (specResult.ok !== true) {
      return await _outcome.dispatchError(_context, request, opSeq, specResult.errorCode, specResult.errorMessage, specResult.diagnostics, false, null);
    }
    helperPlacement = _placeHelper.appendHelperAfterOwner(_context._KDB, request.ownerVisId, helperWidgetId, ownerRuntime, opSeq);
    var applyResult = await _runHelperBinding({ _KDB: _context._KDB }, buildApplyContext(request, opSeq, ownerRuntime, helperWidgetId, specResult.spec));
    if (isStale(_context, request.ownerVisId, opSeq, ownerRuntime) || applyResult.status === "aborted") {
      _placeHelper.restoreHelperPlacement(_context._KDB, helperWidgetId, helperPlacement, ownerRuntime);
      return _outcome.stale(request.ownerVisId, opSeq);
    }
    if (applyResult.ok !== true) {
      _placeHelper.restoreHelperPlacement(_context._KDB, helperWidgetId, helperPlacement, ownerRuntime);
      return await _outcome.dispatchError(_context, request, opSeq, applyResult.errorCode, applyResult.errorMessage, applyResult.diagnostics, false, null);
    }
    writeHelperApplyRuntime(ownerRuntime, helperWidgetId, applyResult, specResult.spec);
    return await runReadAndExtract(_context, request, opSeq, ownerRuntime, helperWidgetId, specResult.spec, helperPlacement);
  }

  async function runReadAndExtract(_context, request, opSeq, ownerRuntime, helperWidgetId, spec, helperPlacement) {
    var readResult = await _readHelperTableRows({ _KDB: _context._KDB }, buildReadContext(request, opSeq, ownerRuntime, helperWidgetId));
    _placeHelper.restoreHelperPlacement(_context._KDB, helperWidgetId, helperPlacement, ownerRuntime);
    if (isStale(_context, request.ownerVisId, opSeq, ownerRuntime) || readResult.status === "aborted") {
      return _outcome.stale(request.ownerVisId, opSeq);
    }
    if (readResult.ok !== true) {
      return await _outcome.dispatchError(_context, request, opSeq, readResult.errorCode, readResult.errorMessage, readResult.diagnostics, true, spec);
    }
    var extract = _extractTopNResult(readResult.readResult, request.dataConfig, request.topNChoice, _validateResolve.readTopNOptions(request.config));
    if (extract.ok !== true) {
      return await _outcome.dispatchError(_context, request, opSeq, extract.errorCode, extract.errorMessage, extract.diagnostics, true, spec);
    }
    return await _outcome.dispatchSuccess(_context, request, opSeq, extract.resultValues, extract.excludeItemId, spec);
  }

  function buildClaimContext(context, request, opSeq, ownerRuntime) {
    return { ownerVisId: request.ownerVisId, opSeq: opSeq, ownerRuntime: ownerRuntime, dispatchInternal: context.dispatchInternal, tabId: request.tabId || null };
  }

  function buildSpecContext(request, opSeq, ownerRuntime, helperWidgetId) {
    return Object.assign({}, request, { opSeq: opSeq, ownerRuntime: ownerRuntime, helperWidgetId: helperWidgetId });
  }

  function buildApplyContext(request, opSeq, ownerRuntime, helperWidgetId, spec) {
    var resolveController = ownerRuntime.abortControllers ? ownerRuntime.abortControllers.resolve : null;
    return {
      ownerVisId: request.ownerVisId,
      helperWidgetId: helperWidgetId,
      ownerRuntime: ownerRuntime,
      opSeq: opSeq,
      spec: spec,
      signal: resolveController ? resolveController.signal : null,
      previousManagedFilterItemIds: ownerRuntime.helperManagedFilterItemIds || []
    };
  }

  function buildReadContext(request, opSeq, ownerRuntime, helperWidgetId) {
    var resolveController = ownerRuntime.abortControllers ? ownerRuntime.abortControllers.resolve : null;
    return {
      ownerVisId: request.ownerVisId,
      helperWidgetId: helperWidgetId,
      ownerRuntime: ownerRuntime,
      opSeq: opSeq,
      signal: resolveController ? resolveController.signal : null
    };
  }

  function writeHelperClaim(_context, ownerVisId, helperWidgetId, claimToken) {
    var ownerRuntime = _context.readOwnerRuntime(ownerVisId);
    ownerRuntime.helperWidgetId = helperWidgetId;
    if (claimToken) {
      ownerRuntime.claimToken = claimToken;
    }
  }

  function writeHelperApplyRuntime(ownerRuntime, helperWidgetId, applyResult, spec) {
    ownerRuntime.helperWidgetId = helperWidgetId;
    ownerRuntime.helperManagedFilterItemIds = applyResult.managedFilterItemIds || [];
    ownerRuntime.lastHelperPlan = applyResult.plan || null;
    ownerRuntime.lastHelperDataConfig = spec.dataConfig || null;
  }

  function isStale(_context, ownerVisId, opSeq, ownerRuntime) {
    var resolveController = ownerRuntime.abortControllers ? ownerRuntime.abortControllers.resolve : null;
    return _context.isStaleOpSeq(ownerVisId, opSeq) || _helpers.isAborted(resolveController && resolveController.signal);
  }

  return __controller;
});
