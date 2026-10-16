define([
  "../config/actionTypes.js",
  "./mirrorTopNHelperClaim.js",
  "./effectResultHelpers.js"
], function (_actionTypes, _mirrorTopNHelperClaim, _helpers) {
  "use strict";

  var CLAIM_CONFIRM_MS = 50;

  async function attemptClaim(_deps, _context, _helperWidgetId) {
    return executeClaim(_deps, _context, _helperWidgetId, generateClaimToken(), { retryOnFailure: true });
  }

  async function confirmCurrent(_deps, _context, _widgets) {
    var helperWidgetId = readCurrentHelperId(_deps, _context);
    if (!helperWidgetId || !isWidgetInList(_widgets, helperWidgetId)) {
      return null;
    }
    var claimToken = readOwnerClaimToken(_deps, _context.ownerVisId) || _context.ownerRuntime.claimToken || generateClaimToken();
    return executeClaim(_deps, _context, helperWidgetId, claimToken, { retryOnFailure: false });
  }

  async function executeClaim(_deps, _context, helperWidgetId, claimToken, options) {
    try {
      writePendingClaim(_context, helperWidgetId, claimToken);
      _mirrorTopNHelperClaim.mirrorClaimOnShell(_deps._KDB, helperWidgetId, _context.ownerVisId, claimToken);
      await waitForClaimConfirm();
      if (!confirmClaim(_deps, _context, helperWidgetId, claimToken)) {
        _mirrorTopNHelperClaim.clearMirrorIfMatch(_deps._KDB, helperWidgetId, _context.ownerVisId, claimToken);
        return options.retryOnFailure ? { ok: false, status: "retry" } : null;
      }
      return { ok: true, helperWidgetId: helperWidgetId, claimToken: claimToken };
    } catch (err) {
      console.error("[widgetTopN.confirmTopNHelperClaim] claim failed", { ownerVisId: _context && _context.ownerVisId, helperWidgetId: helperWidgetId }, err);
      return _helpers.failure("WIDGET_TOPN_HELPER_CLAIM_FAILED", _helpers.messageFromError(err));
    }
  }

  function isCandidateFree(_deps, _ownerVisId, _helperWidgetId) {
    try {
      if (isHelperClaimedByOther(_deps, _ownerVisId, _helperWidgetId)) {
        return false;
      }
      var mirror = _mirrorTopNHelperClaim.readMirrorFromShell(_deps._KDB, _helperWidgetId);
      if (!mirror.ownerVisId && !mirror.claimToken) {
        return true;
      }
      return mirror.ownerVisId === _ownerVisId;
    } catch (err) {
      console.error("[widgetTopN.confirmTopNHelperClaim] free check failed", { helperWidgetId: _helperWidgetId }, err);
      throw err;
    }
  }

  function confirmClaim(_deps, _context, helperWidgetId, claimToken) {
    var stateRecord = readOwnerState(_deps, _context.ownerVisId);
    var runtime = _context.ownerRuntime || {};
    var mirror = _mirrorTopNHelperClaim.readMirrorFromShell(_deps._KDB, helperWidgetId);
    return stateRecord.helperWidgetId === helperWidgetId &&
      stateRecord.claimToken === claimToken &&
      runtime.helperWidgetId === helperWidgetId &&
      runtime.claimToken === claimToken &&
      mirror.ownerVisId === _context.ownerVisId &&
      mirror.claimToken === claimToken;
  }

  function writePendingClaim(_context, helperWidgetId, claimToken) {
    if (_context.ownerRuntime) {
      _context.ownerRuntime.helperWidgetId = helperWidgetId;
      _context.ownerRuntime.claimToken = claimToken;
    }
    if (typeof _context.dispatchInternal === "function") {
      _context.dispatchInternal({
        type: _actionTypes.HELPER_CLAIMED,
        widgetId: _context.ownerVisId,
        payload: { helperWidgetId: helperWidgetId, claimToken: claimToken }
      });
    }
  }

  function isHelperClaimedByOther(_deps, ownerVisId, helperWidgetId) {
    var topN = _deps._KDB && _deps._KDB.state && _deps._KDB.state.widgets ? _deps._KDB.state.widgets.topN : null;
    var ownerIds = topN && topN.byOwner ? Object.keys(topN.byOwner) : [];
    return ownerIds.some(function (otherOwnerId) {
      var record = topN.byOwner[otherOwnerId];
      return otherOwnerId !== ownerVisId && record && record.helperWidgetId === helperWidgetId && record.claimToken;
    });
  }

  function readCurrentHelperId(_deps, _context) {
    var stateRecord = readOwnerState(_deps, _context.ownerVisId);
    return stateRecord.helperWidgetId || (_context.ownerRuntime && _context.ownerRuntime.helperWidgetId) || _context.helperWidgetId || null;
  }

  function readOwnerState(_deps, ownerVisId) {
    var topN = _deps._KDB && _deps._KDB.state && _deps._KDB.state.widgets ? _deps._KDB.state.widgets.topN : null;
    if (!topN || !topN.byOwner || !topN.byOwner[ownerVisId]) {
      return { helperWidgetId: null, claimToken: null };
    }
    return topN.byOwner[ownerVisId];
  }

  function readOwnerClaimToken(_deps, ownerVisId) {
    return readOwnerState(_deps, ownerVisId).claimToken || null;
  }

  function isWidgetInList(widgets, widgetId) {
    return widgets.some(function (entry) {
      return entry.widgetId === widgetId;
    });
  }

  function waitForClaimConfirm() {
    return new Promise(resolveClaimDelay);
  }

  function resolveClaimDelay(resolve) {
    setTimeout(resolve, CLAIM_CONFIRM_MS);
  }

  function generateClaimToken() {
    return "topn-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  return { attemptClaim: attemptClaim, confirmCurrent: confirmCurrent, isCandidateFree: isCandidateFree };
});
