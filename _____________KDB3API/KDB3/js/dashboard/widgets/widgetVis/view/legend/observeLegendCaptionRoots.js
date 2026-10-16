define(["./onLegendTextObserverRecords.js"], function (_onLegendTextObserverRecords) {
  "use strict";

  function observeLegendCaptionRoots(_observeRoot, _observerDeps) {
    try {
      var observer = new MutationObserver(
        _onLegendTextObserverRecords.bind(null, _observerDeps)
      );
      observer.observe(_observeRoot, {
        attributes: true,
        attributeFilter: ["id"],
        characterData: true,
        characterDataOldValue: true,
        childList: true,
        subtree: true
      });
      return observer;
    } catch (err) {
      console.error("[widgetVis.observeLegendCaptionRoots] failed", err);
      throw err;
    }
  }

  return observeLegendCaptionRoots;
});
