define([
  "../config.js",
  "../ownerRouter.js"
], function (_config, _ownerRouter) {
  "use strict";

  var BOTTOM_CLASS = String(_config.CHROME.filterItemBottomSelector || "").replace(/^\./, "");
  var TEXT_CLASS = String(_config.CHROME.filterItemTextSelector || "").replace(/^\./, "");
  var COMMITTED_DISPLAY_SELECTOR = _config.CHROME.committedDisplayMatchSelector;

  function readFilterWrapperCount(dockRoot, selectors) {
    var selector = selectors && selectors.filterItemSelector;
    if (!selector || !dockRoot || typeof dockRoot.querySelectorAll !== "function") {
      return 0;
    }
    return dockRoot.querySelectorAll(selector).length;
  }

  function dockHasCommittedDisplay(dockRoot) {
    return !!(dockRoot && (dockRoot.closest(COMMITTED_DISPLAY_SELECTOR) || dockRoot.querySelector(COMMITTED_DISPLAY_SELECTOR)));
  }

  function shouldDispatchHeaderObserved(summary) {
    return !!summary && ((summary.addedCount || 0) > 0 || (summary.removedCount || 0) > 0 || (summary.nonKdbAttributeCount || 0) > 0);
  }

  function evaluateHeaderResync(_KDB, summary, dockRoot, selectors) {
    if (!shouldDispatchHeaderObserved(summary)) {
      return false;
    }
    _ownerRouter.dispatchHeaderObservedToOwners(_KDB, {
      source: "filterDockHeaderObserved",
      observedAt: summary.observedAt || Date.now(),
      addedCount: summary.addedCount || 0,
      removedCount: summary.removedCount || 0,
      attributeCount: summary.nonKdbAttributeCount || 0,
      filterWrapperCount: readFilterWrapperCount(dockRoot, selectors)
    });
    return true;
  }

  function signatureMentionsCommittedDisplay(signature) {
    var text = signature ? String(signature) : "";
    return text.indexOf(BOTTOM_CLASS) !== -1 || text.indexOf(TEXT_CLASS) !== -1;
  }

  function shouldDispatchCommittedDisplayObserved(summary, dockRoot) {
    if (!summary) {
      return false;
    }
    if (
      signatureMentionsCommittedDisplay(summary.lastAddedSignature) ||
      signatureMentionsCommittedDisplay(summary.lastRemovedSignature) ||
      signatureMentionsCommittedDisplay(summary.lastNonKdbAttributeSignature)
    ) {
      return true;
    }
    return ((summary.addedCount || 0) > 0 || (summary.removedCount || 0) > 0) && dockHasCommittedDisplay(dockRoot);
  }

  function evaluateCommittedDisplayResync(_KDB, summary, dockRoot, selectors) {
    var addedCount;
    var removedCount;
    var attributeCount;
    if (!shouldDispatchCommittedDisplayObserved(summary, dockRoot)) {
      return false;
    }
    addedCount = summary.addedCount || 0;
    removedCount = summary.removedCount || 0;
    attributeCount = summary.nonKdbAttributeCount || 0;
    _ownerRouter.dispatchCommittedDisplayObservedToOwners(_KDB, {
      source: "filterDockCommittedDisplayObserved",
      observedAt: summary.observedAt || Date.now(),
      addedCount: addedCount,
      removedCount: removedCount,
      attributeCount: attributeCount,
      committedDisplayMutationCount: addedCount + removedCount + attributeCount,
      filterWrapperCount: readFilterWrapperCount(dockRoot, selectors)
    });
    return true;
  }

  return {
    readFilterWrapperCount: readFilterWrapperCount,
    dockHasCommittedDisplay: dockHasCommittedDisplay,
    evaluateHeaderResync: evaluateHeaderResync,
    evaluateCommittedDisplayResync: evaluateCommittedDisplayResync
  };
});
