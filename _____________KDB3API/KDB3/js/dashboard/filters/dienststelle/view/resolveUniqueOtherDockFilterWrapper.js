define(["../config/selectors.js"], function (_selectors) {
  "use strict";

  function closestWrapper(_el) {
    return _el && _el.closest ? _el.closest("." + _selectors.filterItemWrapperClass) : null;
  }

  function readMatchingActiveFilterEl(_KDB, _activeFilterKey) {
    var refs = _KDB && _KDB.runtime && _KDB.runtime.filterDock
      ? _KDB.runtime.filterDock.domRefs
      : null;
    var activeFilterEl = refs ? refs.activeFilterEl : null;
    var attr = _selectors.filterDataIdAttr;
    var hits;
    if (!activeFilterEl || !activeFilterEl.isConnected || !activeFilterEl.closest) {
      return null;
    }
    if (!activeFilterEl.closest(_selectors.pageContextDockBucketSelector)) {
      return null;
    }
    if (activeFilterEl.getAttribute && activeFilterEl.getAttribute(attr) === _activeFilterKey) {
      return activeFilterEl;
    }
    hits = activeFilterEl.querySelectorAll
      ? activeFilterEl.querySelectorAll("[" + attr + "=\"" + _activeFilterKey + "\"]")
      : [];
    return hits.length ? activeFilterEl : null;
  }

  function __controller(_KDB, _activeFilterKey) {
    try {
      var bucket;
      var matches;
      var overlayWrapper;
      var idx;
      if (!_activeFilterKey || typeof document === "undefined") {
        return null;
      }
      bucket = document.querySelector(_selectors.pageContextDockBucketSelector);
      if (!bucket || !bucket.querySelectorAll) {
        return null;
      }
      matches = bucket.querySelectorAll(
        "[" + _selectors.filterDataIdAttr + "=\"" + _activeFilterKey + "\"]"
      );
      if (!matches.length) {
        return null;
      }
      if (matches.length === 1) {
        return closestWrapper(matches[0]);
      }
      overlayWrapper = closestWrapper(readMatchingActiveFilterEl(_KDB, _activeFilterKey));
      if (!overlayWrapper) {
        return null;
      }
      for (idx = 0; idx < matches.length; idx += 1) {
        if (closestWrapper(matches[idx]) === overlayWrapper) {
          return overlayWrapper;
        }
      }
      return null;
    } catch (error) {
      console.error("[dienststelle.resolveUniqueOtherDockFilterWrapper] failed", error);
      throw error;
    }
  }

  return __controller;
});
