define([
  "../effects/cleanupTopNHelper.js",
  "./validateOwnerVisId.js",
  "../runtime/ensureWidgetTopNRuntime.js",
  "../effects/effectResultHelpers.js"
], function (_cleanupTopNHelper, _validateOwnerVisId, _runtime, _helpers) {
  "use strict";

  async function __controller(_context, _action) {
    try {
      var request = validateRequest(_action);
      if (request.ok !== true) {
        return request;
      }
      var ownerRuntime = _context.readOwnerRuntime(request.ownerVisId);
      _runtime.abortOwnerResolve(ownerRuntime);
      if (request.clearHelperBinding === true || request.releaseClaim === true) {
        var cleanup = await _cleanupTopNHelper({ _KDB: _context._KDB }, buildCleanupContext(request, ownerRuntime));
        if (cleanup.ok !== true && cleanup.status !== "aborted") {
          _context.dispatchInternal({
            type: _context.actionTypes.ERROR_RECORDED,
            widgetId: request.ownerVisId,
            payload: { errorCode: cleanup.errorCode || "WIDGET_TOPN_CLEANUP_FAILED", errorMessage: cleanup.errorMessage || null }
          });
          return normalizeFailure(request, cleanup);
        }
      }
      clearOwnerRuntime(ownerRuntime, request.releaseClaim);
      _context.dispatchInternal({
        type: _context.actionTypes.CLEANUP_SUCCEEDED,
        widgetId: request.ownerVisId,
        payload: { releaseClaim: request.releaseClaim }
      });
      return { ok: true, ownerVisId: request.ownerVisId, helperWidgetId: request.releaseClaim ? null : ownerRuntime.helperWidgetId, status: "success" };
    } catch (err) {
      console.error("[widgetTopN.handleCleanup] failed", { widgetId: _action && _action.widgetId }, err);
      return { ok: false, status: "error", errorCode: "WIDGET_TOPN_CLEANUP_FAILED", errorMessage: _helpers.messageFromError(err) };
    }
  }

  function validateRequest(_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var ownerVisId = _validateOwnerVisId.readOwnerVisId(_action);
    if (!ownerVisId || _validateOwnerVisId.hasOwnerIdConflict(_action)) {
      return _validateOwnerVisId.ownerIdConflictResult();
    }
    return {
      ok: true,
      ownerVisId: ownerVisId,
      reason: payload.reason || "cleanup",
      clearHelperBinding: payload.clearHelperBinding === true,
      releaseClaim: payload.releaseClaim === true,
      dataConfig: payload.dataConfig || null,
      config: payload.config || {}
    };
  }

  function buildCleanupContext(request, ownerRuntime) {
    return {
      ownerVisId: request.ownerVisId,
      helperWidgetId: ownerRuntime.helperWidgetId,
      ownerRuntime: ownerRuntime,
      opSeq: ownerRuntime.opSeq || null,
      signal: { aborted: false },
      clearHelperBinding: request.clearHelperBinding === true && !!ownerRuntime.helperWidgetId,
      releaseClaim: request.releaseClaim === true && !!ownerRuntime.helperWidgetId,
      cleanupReason: request.reason,
      dataConfig: request.dataConfig || ownerRuntime.lastHelperDataConfig || null,
      helperDataConfig: ownerRuntime.lastHelperDataConfig || request.dataConfig || null,
      config: request.config || {}
    };
  }

  function clearOwnerRuntime(ownerRuntime, releaseClaim) {
    if (!ownerRuntime) {
      return;
    }
    ownerRuntime.pendingPromises = {};
    ownerRuntime.timers = {};
    if (releaseClaim === true) {
      ownerRuntime.helperWidgetId = null;
      ownerRuntime.claimToken = null;
      ownerRuntime.helperManagedFilterItemIds = [];
      ownerRuntime.lastHelperPlan = null;
      ownerRuntime.lastHelperDataConfig = null;
    }
  }

  function normalizeFailure(request, cleanup) {
    return {
      ok: false,
      ownerVisId: request.ownerVisId,
      status: cleanup.status || "error",
      errorCode: cleanup.errorCode || "WIDGET_TOPN_CLEANUP_FAILED",
      errorMessage: cleanup.errorMessage,
      diagnostics: cleanup.diagnostics
    };
  }

  return __controller;
});
