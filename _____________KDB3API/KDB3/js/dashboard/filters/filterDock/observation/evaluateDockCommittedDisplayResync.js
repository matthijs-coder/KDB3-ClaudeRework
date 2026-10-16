define([
  "../effects/dispatchFilterHandoff.js",
  "./isCommittedDisplayMutationTarget.js",
  "../../../../core/cognosHost/config/filterDockChromeSelectors.js"
], function (_dispatchFilterHandoff, _isCommittedDisplayMutationTarget, _filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;
  var BOTTOM_CLASS = String(chrome.filterItemBottomSelector || "").replace(/^\./, "");
  var TEXT_CLASS = String(chrome.filterItemTextSelector || "").replace(/^\./, "");

  function readFilterWrapperCount(_dockRoot, _selectors) {
    var selector = _selectors && _selectors.filterItemSelector;
    if (!selector || !_dockRoot || typeof _dockRoot.querySelectorAll !== "function") {
      return 0;
    }
    return _dockRoot.querySelectorAll(selector).length;
  }

  function signatureMentionsCommittedDisplay(_signature) {
    var signature = _signature ? String(_signature) : "";
    return (
      signature.indexOf(BOTTOM_CLASS) !== -1 ||
      signature.indexOf(TEXT_CLASS) !== -1
    );
  }

  function summaryMentionsCommittedDisplay(_mutationSummary) {
    return (
      signatureMentionsCommittedDisplay(_mutationSummary.lastAddedSignature) ||
      signatureMentionsCommittedDisplay(_mutationSummary.lastRemovedSignature) ||
      signatureMentionsCommittedDisplay(_mutationSummary.lastNonKdbAttributeSignature)
    );
  }

  function shouldDispatchCommittedDisplayObserved(_mutationSummary, _dockRoot) {
    var addedCount;
    var removedCount;
    if (!_mutationSummary) {
      return false;
    }
    if (summaryMentionsCommittedDisplay(_mutationSummary)) {
      return true;
    }
    addedCount = _mutationSummary.addedCount || 0;
    removedCount = _mutationSummary.removedCount || 0;
    return (addedCount > 0 || removedCount > 0) && _isCommittedDisplayMutationTarget(_dockRoot);
  }

  function buildPayload(_mutationSummary, _dockRoot, _selectors) {
    var addedCount = _mutationSummary.addedCount || 0;
    var removedCount = _mutationSummary.removedCount || 0;
    var attributeCount = _mutationSummary.nonKdbAttributeCount || 0;
    return {
      source: "filterDockCommittedDisplayObserved",
      observedAt: _mutationSummary.observedAt || Date.now(),
      addedCount: addedCount,
      removedCount: removedCount,
      attributeCount: attributeCount,
      committedDisplayMutationCount: addedCount + removedCount + attributeCount,
      filterWrapperCount: readFilterWrapperCount(_dockRoot, _selectors)
    };
  }

  function __controller(_KDB, _mutationSummary, _dockRoot, _selectors) {
    if (!shouldDispatchCommittedDisplayObserved(_mutationSummary, _dockRoot)) {
      return false;
    }
    _dispatchFilterHandoff.dispatchCommittedDisplayObservedToOwners(
      _KDB,
      buildPayload(_mutationSummary, _dockRoot, _selectors)
    );
    return true;
  }

  return __controller;
});
