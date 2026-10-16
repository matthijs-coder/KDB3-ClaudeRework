define([
  "../state/cloneSerializable.js",
  "./effectResultHelpers.js",
  "./releaseTopNClaim.js",
  "./dismissHelperTitleEdit.js",
  "../runtime/ensureWidgetTopNRuntime.js"
], function (_cloneSerializable, _helpers, _releaseTopNClaim, _dismissHelperTitleEdit, _runtime) {
  "use strict";

  var CLEANUP_KEY_PREFIX = "helperCleanup:";
  var CLEANUP_SETTLE_TIMEOUT_MS = 5000;

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

  // At most one cleanup runs per helper. A newer cleanup or a claimant aborts
  // the running one and waits until it has settled, so no other op touches the
  // helper while a cleanup apply is still in flight. The claimant's own
  // pre-apply reset replaces an aborted cleanup (contract §8.3).
  function runExclusiveHelperCleanup(_deps, _context) {
    var runtime = _runtime.ensureRuntime(_deps._KDB);
    var key = CLEANUP_KEY_PREFIX + _context.helperWidgetId;
    var previous = runtime.pendingPromises[key] || null;
    var controller = new AbortController();
    if (runtime.abortControllers[key]) {
      runtime.abortControllers[key].abort();
    }
    runtime.abortControllers[key] = controller;
    var record = { controller: controller, promise: null };
    record.promise = runCleanupAfter(_deps, _context, previous, controller.signal);
    runtime.pendingPromises[key] = record;
    var release = releaseCleanupRecord.bind(null, runtime, key, record);
    record.promise.then(release, release);
    return record.promise;
  }

  async function runCleanupAfter(_deps, _context, previous, signal) {
    if (previous) {
      await waitForSettle(previous, null, _context.helperWidgetId);
    }
    return __controller(_deps, Object.assign({}, _context, { signal: signal }));
  }

  // Resolves true when no cleanup runs on the helper (any more), false when
  // _signal aborted the wait. A cleanup that does not settle in time is logged
  // and the caller proceeds, as before this gate existed.
  async function settleHelperCleanup(_KDB, _helperWidgetId, _signal) {
    var runtime = _runtime.ensureRuntime(_KDB);
    var record = _helperWidgetId ? runtime.pendingPromises[CLEANUP_KEY_PREFIX + _helperWidgetId] : null;
    if (!record) {
      return true;
    }
    record.controller.abort();
    return (await waitForSettle(record, _signal, _helperWidgetId)) !== "aborted";
  }

  function waitForSettle(record, signal, helperWidgetId) {
    var listenable = !!signal && typeof signal.addEventListener === "function";
    return new Promise(function (resolve) {
      var timerId = setTimeout(onTimeout, CLEANUP_SETTLE_TIMEOUT_MS);
      function finish(outcome) {
        clearTimeout(timerId);
        if (listenable) {
          signal.removeEventListener("abort", onAbort);
        }
        resolve(outcome);
      }
      function onAbort() {
        finish("aborted");
      }
      function onTimeout() {
        console.warn("[widgetTopN.settleHelperCleanup] helper cleanup did not settle", { helperWidgetId: helperWidgetId });
        finish("timeout");
      }
      if (signal && signal.aborted) {
        finish("aborted");
        return;
      }
      if (listenable) {
        signal.addEventListener("abort", onAbort);
      }
      record.promise.then(finish.bind(null, "settled"), finish.bind(null, "settled"));
    });
  }

  function releaseCleanupRecord(runtime, key, record) {
    if (runtime.pendingPromises[key] === record) {
      delete runtime.pendingPromises[key];
    }
    if (runtime.abortControllers[key] === record.controller) {
      delete runtime.abortControllers[key];
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
    if (!isStaleCleanup(_context) && isOwnersCurrentHelper(_context)) {
      writeCleanupRuntime(_context.ownerRuntime, plan);
    }
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

  function isOwnersCurrentHelper(_context) {
    return !_context.ownerRuntime || _context.ownerRuntime.helperWidgetId === _context.helperWidgetId;
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

  return {
    cleanupTopNHelper: __controller,
    runExclusiveHelperCleanup: runExclusiveHelperCleanup,
    settleHelperCleanup: settleHelperCleanup
  };
});
