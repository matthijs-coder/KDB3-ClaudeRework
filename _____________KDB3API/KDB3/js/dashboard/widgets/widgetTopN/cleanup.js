define([
  "../widgetBase/state/selectors.js",
  "./state.js",
  "./results.js",
  "./helperClaim.js",
  "./helperSpec.js",
  "./helperBinding.js",
  "./helperPlacement.js"
], function (_widgetBaseSelectors, _state, _results, _claim, _spec, _binding, _placement) {
  "use strict";

  // widgetTopN/cleanup: abort the owner's resolve, then clear the helper
  // binding and/or release the claim.
  async function handleCleanup(_context, _action) {
    var request = _state.validateCleanupRequest(_action);
    if (request.ok !== true) {
      return request;
    }
    var ownerRuntime = _context.readOwnerRuntime(request.ownerVisId);
    _context.abortOwnerOperation(ownerRuntime);
    var failure = null;
    if (request.clearHelperBinding === true || request.releaseClaim === true) {
      var cleanupContext = buildCleanupContext(request, ownerRuntime);
      var cleanup = await runRequestedCleanup(_context._KDB, cleanupContext);
      if (cleanup.ok !== true && cleanup.status !== "aborted") {
        _context.dispatchInternal({
          type: _state.ACTION_TYPES.ERROR_RECORDED,
          widgetId: request.ownerVisId,
          payload: { errorCode: cleanup.errorCode || "WIDGET_TOPN_CLEANUP_FAILED", errorMessage: cleanup.errorMessage || null }
        });
        failure = cleanupFailure(request, cleanup);
        if (!releasesDespiteFailure(request)) {
          return failure;
        }
        // The next claimant resets the helper in its own pre-apply, so a clear that cannot run must not keep the claim.
        _claim.releaseTopNClaim(_context._KDB, cleanupContext);
      }
    }
    resetOwnerRuntime(ownerRuntime, request.releaseClaim);
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.CLEANUP_SUCCEEDED,
      widgetId: request.ownerVisId,
      payload: { releaseClaim: request.releaseClaim }
    });
    var result = failure || {
      ok: true,
      ownerVisId: request.ownerVisId,
      helperWidgetId: request.releaseClaim ? null : ownerRuntime.helperWidgetId,
      status: "success"
    };
    if (request.releaseClaim === true && isOwnerGone(_context._KDB, request.ownerVisId)) {
      _context.removeOwner(request.ownerVisId, ownerRuntime);
    }
    return result;
  }

  function releasesDespiteFailure(request) {
    return request.releaseClaim === true && (request.reason === "remove" || request.reason === "destroy");
  }

  // widgetBase keeps the frame of a removed widget with placement "removed".
  function isOwnerGone(_KDB, ownerVisId) {
    var frame = _widgetBaseSelectors.readFrame(_KDB, ownerVisId);
    return !frame || frame.placement === "removed";
  }

  // A release-only cleanup (Jahr wave) does no helper work and must not abort a
  // running post-resolution cleanup; the next claimant settles that one.
  function runRequestedCleanup(_KDB, cleanupContext) {
    if (cleanupContext.clearHelperBinding === true) {
      return runExclusiveCleanup(_KDB, cleanupContext);
    }
    return cleanupTopNHelper(_KDB, cleanupContext);
  }

  function buildCleanupContext(request, ownerRuntime) {
    return {
      ownerVisId: request.ownerVisId,
      helperWidgetId: ownerRuntime.helperWidgetId,
      ownerRuntime: ownerRuntime,
      opSeq: ownerRuntime.opSeq || null,
      clearHelperBinding: request.clearHelperBinding === true && !!ownerRuntime.helperWidgetId,
      releaseClaim: request.releaseClaim === true && !!ownerRuntime.helperWidgetId,
      cleanupReason: request.reason,
      dataConfig: request.dataConfig || ownerRuntime.lastHelperDataConfig || null,
      helperDataConfig: ownerRuntime.lastHelperDataConfig || request.dataConfig || null,
      config: request.config || {}
    };
  }

  function resetOwnerRuntime(ownerRuntime, releaseClaim) {
    if (releaseClaim !== true) {
      return;
    }
    ownerRuntime.helperWidgetId = null;
    ownerRuntime.claimToken = null;
    ownerRuntime.helperManagedFilterItemIds = [];
    ownerRuntime.lastHelperPlan = null;
    ownerRuntime.lastHelperDataConfig = null;
  }

  function cleanupFailure(request, cleanup) {
    return {
      ok: false,
      ownerVisId: request.ownerVisId,
      status: cleanup.status || "error",
      errorCode: cleanup.errorCode || "WIDGET_TOPN_CLEANUP_FAILED",
      errorMessage: cleanup.errorMessage,
      diagnostics: cleanup.diagnostics
    };
  }

  // The owner's outcome is returned before the helper cleanup finishes, so the
  // visible chart does not wait for the cleanup render of the hidden helper.
  // The owner keeps its claim; the next claimant of this helper aborts and
  // awaits this cleanup before it touches the helper (runExclusiveHelperCleanup).
  function startPostResolutionCleanup(_context, _op, _spec) {
    var request = _op.request;
    var ownerRuntime = _op.ownerRuntime;
    if (!_spec || _state.isDefaultTopN(request.topNChoice)) {
      return;
    }
    if (_context.isStaleOpSeq(request.ownerVisId, _op.opSeq) || _results.isAborted(_op.signal)) {
      return;
    }
    if (!ownerRuntime.helperWidgetId || ownerRuntime.helperWidgetId !== _spec.widgetId) {
      return;
    }
    var helperWidgetId = ownerRuntime.helperWidgetId;
    runExclusiveCleanup(_context._KDB, {
      ownerVisId: request.ownerVisId,
      helperWidgetId: helperWidgetId,
      ownerRuntime: ownerRuntime,
      opSeq: _op.opSeq,
      clearHelperBinding: true,
      releaseClaim: false,
      cleanupReason: "postResolution",
      helperDataConfig: _spec.dataConfig,
      config: request.config
    }).then(
      warnIfCleanupFailed.bind(null, request.ownerVisId, helperWidgetId, _op.opSeq),
      logCleanupError.bind(null, request.ownerVisId, helperWidgetId, _op.opSeq)
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

  function runExclusiveCleanup(_KDB, _context) {
    return _claim.runExclusiveHelperCleanup(_KDB, _context.helperWidgetId, function (signal) {
      return cleanupTopNHelper(_KDB, Object.assign({}, _context, { signal: signal }));
    });
  }

  // Boundary for the helper cleanup: binding-service failures become
  // WIDGET_TOPN_CLEANUP_FAILED, an abort becomes a stale result.
  async function cleanupTopNHelper(_KDB, _context) {
    try {
      if (_context.clearHelperBinding === true) {
        var cleared = await applyCleanupPlan(_KDB, _context);
        // An aborted clear still releases the claim, or the claim attributes stay on the helper.
        if (cleared.ok !== true && !(cleared.status === "aborted" && _context.releaseClaim === true)) {
          return cleared;
        }
      }
      if (_context.releaseClaim === true) {
        return _claim.releaseTopNClaim(_KDB, _context);
      }
      return { ok: true, status: "success", diagnostics: null };
    } catch (err) {
      if (_results.isAbortError(err)) {
        return _results.staleAborted();
      }
      console.error("[widgetTopN.cleanupTopNHelper] failed", { ownerVisId: _context.ownerVisId }, err);
      return _results.failure("WIDGET_TOPN_CLEANUP_FAILED", _results.messageFromError(err));
    }
  }

  async function applyCleanupPlan(_KDB, _context) {
    if (isStaleCleanup(_context)) {
      return _results.staleAborted();
    }
    var services = _binding.readBindingServices(_KDB);
    if (services.ok !== true) {
      return services;
    }
    var spec = _spec.buildCleanupSpec(_context);
    if (!spec.dataConfig) {
      return _results.failure("WIDGET_TOPN_CLEANUP_FAILED", "Missing helper dataConfig for cleanup plan.");
    }
    var plan = services.plan.buildPlan(spec);
    if (isStaleCleanup(_context)) {
      return _results.staleAborted();
    }
    if (!plan || plan.ok !== true || plan.status !== "success") {
      return _results.failure("WIDGET_TOPN_CLEANUP_FAILED", _binding.readPlanError(plan), plan);
    }
    var result;
    try {
      result = await services.apply.applyBinding(plan, _binding.buildHelperApplyOptions(_context, plan));
    } finally {
      // Cleanup render can re-open title-edit if customTitle leftover remains.
      _placement.dismissHelperTitleEdit(_KDB, _context.helperWidgetId);
    }
    if (result && result.status === "aborted") {
      return _results.staleAborted(result);
    }
    if (!result || result.status !== "success") {
      return _results.failure("WIDGET_TOPN_CLEANUP_FAILED", _binding.readApplyError(result), { plan: plan, applyResult: result });
    }
    if (!isStaleCleanup(_context) && isOwnersCurrentHelper(_context)) {
      _context.ownerRuntime.helperManagedFilterItemIds = plan.managedFilterItemIds || [];
      _context.ownerRuntime.lastHelperPlan = null;
    }
    return { ok: true, status: "success", diagnostics: result.diagnostics || null };
  }

  function isOwnersCurrentHelper(_context) {
    return !!_context.ownerRuntime && _context.ownerRuntime.helperWidgetId === _context.helperWidgetId;
  }

  function isStaleCleanup(_context) {
    if (_results.isAborted(_context.signal)) {
      return true;
    }
    var ownerRuntime = _context.ownerRuntime;
    return !!ownerRuntime && typeof _context.opSeq === "number" && ownerRuntime.opSeq !== _context.opSeq;
  }

  return {
    handleCleanup: handleCleanup,
    startPostResolutionCleanup: startPostResolutionCleanup
  };
});
