define([], function () {
  "use strict";

  function messageFromError(err) {
    return String(err && err.message ? err.message : err);
  }

  function failure(errorCode, errorMessage, diagnostics) {
    return { ok: false, status: "error", errorCode: errorCode, errorMessage: errorMessage || errorCode, diagnostics: diagnostics };
  }

  function staleAborted(diagnostics) {
    return { ok: false, status: "aborted", errorCode: "WIDGET_TOPN_STALE_OPERATION", diagnostics: diagnostics || null };
  }

  function isAborted(signal) {
    return !!(signal && signal.aborted);
  }

  function isAbortError(err) {
    return !!(err && err.name === "AbortError");
  }

  function readPlanError(plan) {
    return String(plan && (plan.errorMessage || plan.errorCode) ? plan.errorMessage || plan.errorCode : "Helper plan failed.");
  }

  function readApplyError(applyResult) {
    var diagnostics = applyResult && applyResult.diagnostics ? applyResult.diagnostics : {};
    return String(diagnostics.errorMessage || diagnostics.errorCode || "Helper apply failed.");
  }

  function buildHelperApplyOptions(context, plan) {
    return {
      target: {
        widgetId: context.helperWidgetId,
        targetKind: "topNHelper",
        ownerWidgetId: context.ownerVisId,
        opSeq: context.opSeq,
        reason: plan.reason
      },
      signal: context.signal || { aborted: false },
      previousManagedFilterItemIds: context.previousManagedFilterItemIds ||
        (context.ownerRuntime && context.ownerRuntime.helperManagedFilterItemIds) || [],
      timeoutProfile: "helper"
    };
  }

  return {
    messageFromError: messageFromError,
    failure: failure,
    staleAborted: staleAborted,
    isAborted: isAborted,
    isAbortError: isAbortError,
    readPlanError: readPlanError,
    readApplyError: readApplyError,
    buildHelperApplyOptions: buildHelperApplyOptions
  };
});
