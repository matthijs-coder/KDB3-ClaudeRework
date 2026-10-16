define([
  "../widgetBase/state/selectors.js",
  "./config.js",
  "./state.js",
  "./selectors.js",
  "./results.js",
  "./helperPlacement.js",
  "../../../core/utils/kit/async.js",
  "../../../core/utils/kit/runtime.js"
], function (_widgetBaseSelectors, _config, _state, _selectors, _results, _placement, _async, _rt) {
  "use strict";

  // Claim protocol: write the claim to state and runtime, mirror it on the
  // helper shell, wait CLAIM_CONFIRM_MS, then confirm that all three still
  // agree. A competing owner that wrote in between makes the confirm fail.
  async function claimTopNHelper(_KDB, _context) {
    try {
      var discovery = await readHelperCandidates(_KDB, _context);
      if (discovery.ok !== true) {
        return _results.failure(
          discovery.errorCode || "WIDGET_TOPN_HELPER_CLAIM_FAILED",
          discovery.errorMessage || "TopN helper discovery failed.",
          discovery
        );
      }
      var reuse = await confirmCurrent(_KDB, _context, discovery.widgets);
      return reuse || await claimNextFreeHelper(_KDB, _context, discovery.widgets);
    } catch (err) {
      console.error("[widgetTopN.claimTopNHelper] failed", { ownerVisId: _context && _context.ownerVisId }, err);
      return _results.failure("WIDGET_TOPN_HELPER_CLAIM_FAILED", _results.messageFromError(err));
    }
  }

  async function readHelperCandidates(_KDB, _context) {
    var launchpad = _KDB.api && _KDB.api.launchpad;
    if (!launchpad || typeof launchpad.dispatch !== "function") {
      return _results.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "launchpad dispatch is unavailable.");
    }
    var tabId = resolveOwnerTabId(_KDB, _context);
    if (!tabId) {
      return _results.failure("WIDGET_TOPN_INVALID_REQUEST", "Owner visualization tabId is unavailable.");
    }
    var result = await launchpad.dispatch({
      type: "launchpad/readSlotWidgets",
      payload: { padKey: _config.TOPN_PAD_KEY, tabId: tabId, mode: "all" }
    });
    if (!result || result.ok !== true) {
      return _results.failure(
        result && result.errorCode ? result.errorCode : "WIDGET_TOPN_HELPER_CLAIM_FAILED",
        result && result.errorMessage ? result.errorMessage : "launchpad/readSlotWidgets failed.",
        result
      );
    }
    return { ok: true, tabId: tabId, widgets: result.widgets || [] };
  }

  function resolveOwnerTabId(_KDB, _context) {
    if (_context.tabId) {
      return _context.tabId;
    }
    var frame = _widgetBaseSelectors.readFrame(_KDB, _context.ownerVisId);
    return frame && frame.tabId ? frame.tabId : null;
  }

  async function confirmCurrent(_KDB, _context, widgets) {
    var claim = _selectors.readOwnerClaim(_KDB, _context.ownerVisId);
    var helperWidgetId = claim.helperWidgetId || _context.ownerRuntime.helperWidgetId || null;
    // A superseded op can still hold this owner's helper beside the owner.
    if (!helperWidgetId || !(isWidgetInList(widgets, helperWidgetId) || _placement.isHelperOnLoanToOwner(_context.ownerRuntime, helperWidgetId))) {
      return null;
    }
    var claimToken = claim.claimToken || _context.ownerRuntime.claimToken || generateClaimToken();
    return executeClaim(_KDB, _context, helperWidgetId, claimToken, false);
  }

  async function claimNextFreeHelper(_KDB, _context, widgets) {
    for (var index = 0; index < widgets.length; index += 1) {
      var candidateId = widgets[index].widgetId;
      if (!isCandidateFree(_KDB, _context.ownerVisId, candidateId)) {
        continue;
      }
      var claimResult = await executeClaim(_KDB, _context, candidateId, generateClaimToken(), true);
      if (claimResult.status !== "retry") {
        return claimResult;
      }
    }
    return {
      ok: false,
      status: "noHelperAvailable",
      errorCode: "WIDGET_TOPN_NO_HELPER_AVAILABLE",
      errorMessage: "No claimable TopN helper is available for this tab."
    };
  }

  // Resolves null for a failed reuse confirm, { status: "retry" } for a failed
  // fresh claim, and a stale result when the op is aborted during the wait.
  async function executeClaim(_KDB, _context, helperWidgetId, claimToken, isFreshClaim) {
    writePendingClaim(_context, helperWidgetId, claimToken);
    mirrorClaimOnShell(_KDB, helperWidgetId, _context.ownerVisId, claimToken);
    if (!(await _async.sleep(_config.CLAIM_CONFIRM_MS, _context.signal))) {
      return _results.staleAborted();
    }
    if (!confirmClaim(_KDB, _context, helperWidgetId, claimToken)) {
      clearMirrorIfMatch(_KDB, helperWidgetId, _context.ownerVisId, claimToken);
      return isFreshClaim ? { ok: false, status: "retry" } : null;
    }
    // The claim is ours: a cleanup still running on this helper is moot and
    // must settle before this op moves or rebinds the helper.
    await settleHelperCleanup(_KDB, helperWidgetId, _context.signal);
    return { ok: true, helperWidgetId: helperWidgetId, claimToken: claimToken };
  }

  function isCandidateFree(_KDB, ownerVisId, helperWidgetId) {
    if (_selectors.isHelperClaimedByOtherOwner(_KDB, ownerVisId, helperWidgetId)) {
      return false;
    }
    var mirror = readMirrorFromShell(_KDB, helperWidgetId);
    return (!mirror.ownerVisId && !mirror.claimToken) || mirror.ownerVisId === ownerVisId;
  }

  function confirmClaim(_KDB, _context, helperWidgetId, claimToken) {
    var claim = _selectors.readOwnerClaim(_KDB, _context.ownerVisId);
    var runtime = _context.ownerRuntime || {};
    var mirror = readMirrorFromShell(_KDB, helperWidgetId);
    return claim.helperWidgetId === helperWidgetId &&
      claim.claimToken === claimToken &&
      runtime.helperWidgetId === helperWidgetId &&
      runtime.claimToken === claimToken &&
      mirror.ownerVisId === _context.ownerVisId &&
      mirror.claimToken === claimToken;
  }

  function writePendingClaim(_context, helperWidgetId, claimToken) {
    _context.ownerRuntime.helperWidgetId = helperWidgetId;
    _context.ownerRuntime.claimToken = claimToken;
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.HELPER_CLAIMED,
      widgetId: _context.ownerVisId,
      payload: { helperWidgetId: helperWidgetId, claimToken: claimToken }
    });
  }

  function isWidgetInList(widgets, widgetId) {
    return widgets.some(function (entry) {
      return entry.widgetId === widgetId;
    });
  }

  function generateClaimToken() {
    return "topn-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  function releaseTopNClaim(_KDB, _context) {
    var ownerRuntime = _context.ownerRuntime;
    var claimToken = ownerRuntime && ownerRuntime.claimToken || _selectors.readOwnerClaim(_KDB, _context.ownerVisId).claimToken;
    clearMirrorIfMatch(_KDB, _context.helperWidgetId, _context.ownerVisId, claimToken);
    if (ownerRuntime) {
      ownerRuntime.helperWidgetId = null;
      ownerRuntime.claimToken = null;
    }
    return { ok: true, status: "success", diagnostics: { releaseClaim: true } };
  }

  function mirrorClaimOnShell(_KDB, helperWidgetId, ownerVisId, claimToken) {
    var shellEl = resolveHelperShell(_KDB, helperWidgetId);
    if (shellEl) {
      shellEl.setAttribute(_config.CLAIM_OWNER_ATTR, ownerVisId);
      shellEl.setAttribute(_config.CLAIM_TOKEN_ATTR, claimToken);
    }
  }

  function clearMirrorIfMatch(_KDB, helperWidgetId, ownerVisId, claimToken) {
    var shellEl = resolveHelperShell(_KDB, helperWidgetId);
    var mirror = readMirrorFromElement(shellEl);
    if (shellEl && mirror.ownerVisId === ownerVisId && mirror.claimToken === claimToken) {
      shellEl.removeAttribute(_config.CLAIM_OWNER_ATTR);
      shellEl.removeAttribute(_config.CLAIM_TOKEN_ATTR);
    }
  }

  function readMirrorFromShell(_KDB, helperWidgetId) {
    return readMirrorFromElement(resolveHelperShell(_KDB, helperWidgetId));
  }

  function readMirrorFromElement(shellEl) {
    if (!shellEl) {
      return { ownerVisId: null, claimToken: null };
    }
    return {
      ownerVisId: shellEl.getAttribute(_config.CLAIM_OWNER_ATTR),
      claimToken: shellEl.getAttribute(_config.CLAIM_TOKEN_ATTR)
    };
  }

  function resolveHelperShell(_KDB, helperWidgetId) {
    if (!helperWidgetId) {
      return null;
    }
    var ownerDocument = resolveOwnerDocument(_KDB);
    if (!ownerDocument || typeof ownerDocument.getElementById !== "function") {
      return null;
    }
    return ownerDocument.getElementById(helperWidgetId);
  }

  function resolveOwnerDocument(_KDB) {
    var legacyHostEl = _KDB && _KDB.elements ? _KDB.elements.kdbWidget : null;
    if (legacyHostEl && legacyHostEl.ownerDocument) {
      return legacyHostEl.ownerDocument;
    }
    return typeof document !== "undefined" ? document : null;
  }

  // At most one cleanup runs per helper. A newer cleanup or a claimant aborts
  // the running one and waits until it has settled, so no other op touches the
  // helper while a cleanup apply is still in flight. The claimant's own
  // pre-apply reset replaces an aborted cleanup (contract §8.3).
  // runCleanup(signal) performs the cleanup and must honour the signal.
  function runExclusiveHelperCleanup(_KDB, helperWidgetId, runCleanup) {
    var rt = _rt.ensureRuntime(_KDB, "widgetTopN");
    var key = _config.CLEANUP_KEY_PREFIX + helperWidgetId;
    var previous = rt.pendingPromises[key] || null;
    var controller = new AbortController();
    if (rt.abortControllers[key]) {
      rt.abortControllers[key].abort();
    }
    rt.abortControllers[key] = controller;
    var record = { controller: controller, promise: null };
    record.promise = runAfter(previous, helperWidgetId, runCleanup, controller.signal);
    rt.pendingPromises[key] = record;
    var release = releaseCleanupRecord.bind(null, rt, key, record);
    record.promise.then(release, release);
    return record.promise;
  }

  async function runAfter(previous, helperWidgetId, runCleanup, signal) {
    if (previous) {
      await waitForSettle(previous, null, helperWidgetId);
    }
    return runCleanup(signal);
  }

  // Resolves true when no cleanup runs on the helper (any more), false when
  // _signal aborted the wait. A cleanup that does not settle in time is logged
  // and the caller proceeds, as before this gate existed.
  async function settleHelperCleanup(_KDB, helperWidgetId, _signal) {
    var rt = _rt.ensureRuntime(_KDB, "widgetTopN");
    var record = helperWidgetId ? rt.pendingPromises[_config.CLEANUP_KEY_PREFIX + helperWidgetId] : null;
    if (!record) {
      return true;
    }
    record.controller.abort();
    return (await waitForSettle(record, _signal, helperWidgetId)) !== "aborted";
  }

  function waitForSettle(record, signal, helperWidgetId) {
    var listenable = !!signal && typeof signal.addEventListener === "function";
    return new Promise(function (resolve) {
      var timerId = setTimeout(onTimeout, _config.CLEANUP_SETTLE_TIMEOUT_MS);
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

  function releaseCleanupRecord(rt, key, record) {
    if (rt.pendingPromises[key] === record) {
      delete rt.pendingPromises[key];
    }
    if (rt.abortControllers[key] === record.controller) {
      delete rt.abortControllers[key];
    }
  }

  return {
    claimTopNHelper: claimTopNHelper,
    releaseTopNClaim: releaseTopNClaim,
    runExclusiveHelperCleanup: runExclusiveHelperCleanup,
    settleHelperCleanup: settleHelperCleanup
  };
});
