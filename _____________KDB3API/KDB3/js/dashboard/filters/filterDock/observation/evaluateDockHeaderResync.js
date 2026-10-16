define(["../effects/dispatchFilterHandoff.js"], function (_dispatchFilterHandoff) {
  "use strict";

  function shouldDispatchHeaderObserved(_mutationSummary) {
    if (!_mutationSummary) {
      return false;
    }
    if ((_mutationSummary.addedCount || 0) > 0 || (_mutationSummary.removedCount || 0) > 0) {
      return true;
    }
    return (_mutationSummary.nonKdbAttributeCount || 0) > 0;
  }

  function readFilterWrapperCount(_dockRoot, _selectors) {
    var selector = _selectors && _selectors.filterItemSelector;
    if (!selector || !_dockRoot || typeof _dockRoot.querySelectorAll !== "function") {
      return 0;
    }
    return _dockRoot.querySelectorAll(selector).length;
  }

  function buildPayload(_mutationSummary, _dockRoot, _selectors) {
    return {
      source: "filterDockHeaderObserved",
      observedAt: _mutationSummary.observedAt || Date.now(),
      addedCount: _mutationSummary.addedCount || 0,
      removedCount: _mutationSummary.removedCount || 0,
      attributeCount: _mutationSummary.nonKdbAttributeCount || 0,
      filterWrapperCount: readFilterWrapperCount(_dockRoot, _selectors)
    };
  }

  function __controller(_KDB, _mutationSummary, _dockRoot, _selectors) {
    if (!shouldDispatchHeaderObserved(_mutationSummary)) {
      return false;
    }
    _dispatchFilterHandoff.dispatchHeaderObservedToOwners(
      _KDB,
      buildPayload(_mutationSummary, _dockRoot, _selectors)
    );
    return true;
  }

  return __controller;
});
