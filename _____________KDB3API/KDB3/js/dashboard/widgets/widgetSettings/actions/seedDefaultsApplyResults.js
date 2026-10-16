define([], function () {
  "use strict";

  function normalizeApplyResult(result) {
    const value = result || {};
    return {
      ok: value.ok === true,
      status: value.status || null,
      skipped: value.skipped === true,
      stale: value.stale === true,
      reasonCode: value.reasonCode || null,
      errorCode: value.errorCode || null,
      errorMessage: value.errorMessage || null,
      reportToSettings: value.reportToSettings || null,
      diagnostics: value.diagnostics || null
    };
  }

  function isApplySuccess(result) {
    if (!result || result.ok !== true) {
      return false;
    }
    if (result.status === "success") {
      return true;
    }
    if (result.reportToSettings) {
      return true;
    }
    if (result.skipped !== true && result.stale !== true && !result.errorCode) {
      return true;
    }
    return false;
  }

  function isBatchApplySuccess(result) {
    if (!result || result.ok !== true || result.stale === true) {
      return false;
    }
    if (result.status === "error" || result.status === "timeout" || result.status === "aborted") {
      return false;
    }
    if (result.reportToSettings && result.reportToSettings.controls && result.reportToSettings.controls.length > 0) {
      return true;
    }
    if (result.skipped !== true && !result.errorCode) {
      return true;
    }
    return false;
  }

  function isBatchDeferred(result) {
    if (!result) {
      return false;
    }
    if (result.status === "deferred" || result.status === "pending") {
      return true;
    }
    return false;
  }

  function isTopNDeferred(kind, result) {
    if (kind !== "topN") {
      return false;
    }
    if (!result) {
      return false;
    }
    if (result.status === "deferred" || result.status === "pending") {
      return true;
    }
    if (result.skipped === true && result.reasonCode) {
      return true;
    }
    return false;
  }

  function isVisApplyConfirmed(result) {
    if (!result || result.ok !== true || result.stale === true) {
      return false;
    }
    if (result.skipped === true && !result.reportToSettings) {
      return false;
    }
    if (result.status === "error" || result.status === "timeout" || result.status === "aborted") {
      return false;
    }
    return true;
  }

  return {
    normalizeApplyResult: normalizeApplyResult,
    isApplySuccess: isApplySuccess,
    isBatchApplySuccess: isBatchApplySuccess,
    isBatchDeferred: isBatchDeferred,
    isTopNDeferred: isTopNDeferred,
    isVisApplyConfirmed: isVisApplyConfirmed
  };
});
