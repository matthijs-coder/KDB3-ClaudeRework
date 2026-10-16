define([
  "../../widgetBase/state/selectors.js",
  "./effectResultHelpers.js"
], function (_widgetBaseSelectors, _helpers) {
  "use strict";

  var TOPN_PAD_KEY = "topN";

  async function __controller(_deps, _context) {
    try {
      if (!hasLaunchpadDispatch(_deps)) {
        return _helpers.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "launchpad dispatch is unavailable.");
      }
      var tabId = resolveOwnerTabId(_deps, _context);
      if (!tabId) {
        return _helpers.failure("WIDGET_TOPN_INVALID_REQUEST", "Owner visualization tabId is unavailable.");
      }
      var result = await Promise.resolve(_deps._KDB.api.launchpad.dispatch({
        type: "launchpad/readSlotWidgets",
        payload: { padKey: TOPN_PAD_KEY, tabId: tabId, mode: "all" }
      }));
      if (!result || result.ok !== true) {
        return _helpers.failure(
          result && result.errorCode ? result.errorCode : "WIDGET_TOPN_HELPER_CLAIM_FAILED",
          result && result.errorMessage ? result.errorMessage : "launchpad/readSlotWidgets failed.",
          result
        );
      }
      return { ok: true, tabId: tabId, widgets: result.widgets || [] };
    } catch (err) {
      console.error("[widgetTopN.readTopNHelperCandidates] failed", { ownerVisId: _context && _context.ownerVisId }, err);
      return _helpers.failure("WIDGET_TOPN_HELPER_CLAIM_FAILED", _helpers.messageFromError(err));
    }
  }

  function resolveOwnerTabId(_deps, _context) {
    if (_context && _context.tabId) {
      return _context.tabId;
    }
    var frame = _widgetBaseSelectors.readFrame(_deps._KDB, _context.ownerVisId);
    return frame && frame.tabId ? frame.tabId : null;
  }

  function hasLaunchpadDispatch(_deps) {
    return !!(_deps && _deps._KDB && _deps._KDB.api && _deps._KDB.api.launchpad && typeof _deps._KDB.api.launchpad.dispatch === "function");
  }

  return __controller;
});
