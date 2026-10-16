define([
  "../state/cloneSerializable.js",
  "./effectResultHelpers.js",
  "./releaseTopNClaim.js",
  "./dismissHelperTitleEdit.js"
], function (_cloneSerializable, _helpers, _releaseTopNClaim, _dismissHelperTitleEdit) {
  "use strict";

  async function __controller(_deps, _context) {
    try {
      if (_context.clearHelperBinding === true) {
        var cleanupResult = await applyCleanupPlan(_deps, _context);
        if (cleanupResult.ok !== true) {
          return cleanupResult;
        }
      }
      if (_context.releaseClaim === true) {
        return _releaseTopNClaim.releaseTopNClaim(_deps, _context);
      }
      return { ok: true, status: "success", diagnostics: null };
    } catch (err) {
      if (_helpers.isAbortError(err)) {
        return _helpers.staleAborted();
      }
      console.error("[widgetTopN.cleanupTopNHelper] failed", { ownerVisId: _context && _context.ownerVisId }, err);
      return _helpers.failure("WIDGET_TOPN_CLEANUP_FAILED", _helpers.messageFromError(err));
    }
  }

  async function applyCleanupPlan(_deps, _context) {
    var services = _deps && _deps._KDB ? _deps._KDB.services || {} : {};
    if (isStaleCleanup(_context)) {
      return _helpers.staleAborted();
    }
    if (!services.widgetBindingPlan || typeof services.widgetBindingPlan.buildPlan !== "function") {
      return _helpers.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "widgetBindingPlan.buildPlan is unavailable.");
    }
    if (!services.widgetBindingApply || typeof services.widgetBindingApply.applyBinding !== "function") {
      return _helpers.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "widgetBindingApply.applyBinding is unavailable.");
    }
    var spec = buildCleanupSpec(_context);
    if (!spec.dataConfig) {
      return _helpers.failure("WIDGET_TOPN_CLEANUP_FAILED", "Missing helper dataConfig for cleanup plan.");
    }
    var plan = services.widgetBindingPlan.buildPlan(spec);
    if (isStaleCleanup(_context)) {
      return _helpers.staleAborted();
    }
    if (!plan || plan.ok !== true || plan.status !== "success") {
      return _helpers.failure("WIDGET_TOPN_CLEANUP_FAILED", _helpers.readPlanError(plan), plan);
    }
    var result;
    try {
      result = await services.widgetBindingApply.applyBinding(plan, _helpers.buildHelperApplyOptions(_context, plan));
    } finally {
      // Cleanup render can re-open title-edit if customTitle leftover remains.
      _dismissHelperTitleEdit(_deps && _deps._KDB, _context.helperWidgetId);
    }
    if (result && result.status === "aborted") {
      return _helpers.staleAborted(result);
    }
    if (!result || result.status !== "success") {
      return _helpers.failure("WIDGET_TOPN_CLEANUP_FAILED", _helpers.readApplyError(result), { plan: plan, applyResult: result });
    }
    writeCleanupRuntime(_context.ownerRuntime, plan);
    return { ok: true, status: "success", diagnostics: result.diagnostics || null };
  }

  function buildCleanupSpec(_context) {
    return {
      reason: "cleanup",
      targetKind: "topNHelper",
      widgetId: _context.helperWidgetId,
      ownerWidgetId: _context.ownerVisId,
      opSeq: _context.opSeq,
      dataConfig: _cloneSerializable(_context.helperDataConfig || _context.dataConfig || null),
      hierarchySnapshot: null,
      helperTableResult: null,
      resetIntent: {
        enabled: true,
        scope: "helperTarget",
        clearAllSlots: true,
        clearAllLocalFilters: true,
        reason: _context.cleanupReason || "postResolution"
      },
      emptyIntent: { enabled: false, reason: null, itemId: null, value: null },
      config: _cloneSerializable(_context.config || {})
    };
  }

  function writeCleanupRuntime(ownerRuntime, plan) {
    if (!ownerRuntime) {
      return;
    }
    ownerRuntime.helperManagedFilterItemIds = plan.managedFilterItemIds || [];
    ownerRuntime.lastHelperPlan = null;
  }

  function readSignal(_context) {
    return _context.signal || { aborted: false };
  }

  function isStaleCleanup(_context) {
    var ownerRuntime = _context && _context.ownerRuntime ? _context.ownerRuntime : null;
    if (!ownerRuntime || typeof _context.opSeq !== "number") {
      return false;
    }
    return ownerRuntime.opSeq !== _context.opSeq || readSignal(_context).aborted === true;
  }

  return __controller;
});
