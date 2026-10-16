define([
  "./readTopNHelperCandidates.js",
  "./confirmTopNHelperClaim.js",
  "./effectResultHelpers.js"
], function (_readTopNHelperCandidates, _confirmTopNHelperClaim, _helpers) {
  "use strict";

  async function __controller(_deps, _context) {
    try {
      var discovery = await _readTopNHelperCandidates(_deps, _context);
      if (discovery.ok !== true) {
        return _helpers.failure(discovery.errorCode || "WIDGET_TOPN_HELPER_CLAIM_FAILED", discovery.errorMessage || "TopN helper discovery failed.", discovery);
      }
      var reuse = await _confirmTopNHelperClaim.confirmCurrent(_deps, _context, discovery.widgets);
      if (reuse) {
        return reuse;
      }
      return await claimNextFreeHelper(_deps, _context, discovery.widgets);
    } catch (err) {
      console.error("[widgetTopN.claimTopNHelper] failed", { ownerVisId: _context && _context.ownerVisId }, err);
      return _helpers.failure("WIDGET_TOPN_HELPER_CLAIM_FAILED", _helpers.messageFromError(err));
    }
  }

  async function claimNextFreeHelper(_deps, _context, widgets) {
    var index = 0;
    while (index < widgets.length) {
      var candidateId = widgets[index].widgetId;
      if (_confirmTopNHelperClaim.isCandidateFree(_deps, _context.ownerVisId, candidateId)) {
        var claimResult = await _confirmTopNHelperClaim.attemptClaim(_deps, _context, candidateId);
        if (claimResult.ok === true) {
          return claimResult;
        }
        if (claimResult.status === "retry") {
          index += 1;
          continue;
        }
        return claimResult;
      }
      index += 1;
    }
    return { ok: false, status: "noHelperAvailable", errorCode: "WIDGET_TOPN_NO_HELPER_AVAILABLE", errorMessage: "No claimable TopN helper is available for this tab." };
  }

  return __controller;
});
