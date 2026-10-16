define(["./mirrorTopNHelperClaim.js"], function (_mirrorTopNHelperClaim) {
  "use strict";

  function releaseTopNClaim(_deps, _context) {
    var ownerVisId = _context.ownerVisId;
    var helperWidgetId = _context.helperWidgetId;
    var claimToken = readClaimToken(_deps, _context);
    _mirrorTopNHelperClaim.clearMirrorIfMatch(_deps._KDB, helperWidgetId, ownerVisId, claimToken);
    clearRuntimeClaim(_context.ownerRuntime);
    return { ok: true, status: "success", diagnostics: { releaseClaim: true } };
  }

  function readClaimToken(_deps, _context) {
    if (_context.ownerRuntime && _context.ownerRuntime.claimToken) {
      return _context.ownerRuntime.claimToken;
    }
    var topN = _deps._KDB && _deps._KDB.state && _deps._KDB.state.widgets ? _deps._KDB.state.widgets.topN : null;
    var record = topN && topN.byOwner ? topN.byOwner[_context.ownerVisId] : null;
    return record && record.claimToken ? record.claimToken : null;
  }

  function clearRuntimeClaim(ownerRuntime) {
    if (!ownerRuntime) {
      return;
    }
    ownerRuntime.helperWidgetId = null;
    ownerRuntime.claimToken = null;
  }

  return {
    releaseTopNClaim: releaseTopNClaim,
    readClaimToken: readClaimToken,
    clearRuntimeClaim: clearRuntimeClaim
  };
});
