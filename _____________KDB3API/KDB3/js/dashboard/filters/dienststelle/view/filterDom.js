define(["../config.js"], function (_config) {
  "use strict";

  var SELECTORS = _config.DOM_SELECTORS;

  function resolveBucketSelector(_filterScope) {
    return _filterScope === "global" ? SELECTORS.globalDockBucketSelector : SELECTORS.pageContextDockBucketSelector;
  }

  function filterHostSelector(_filterKey) {
    return "[" + SELECTORS.filterDataIdAttr + '="' + _filterKey + '"]';
  }

  function findScopedFilterWrapper(_activeFilterKey, _filterScope) {
    var dockRoot;
    var bucket;
    var hostEl;
    if (!_activeFilterKey || typeof document === "undefined") {
      return null;
    }
    dockRoot = document.querySelector(SELECTORS.filterDockRootSelector);
    if (!dockRoot) {
      return null;
    }
    bucket = dockRoot.querySelector(resolveBucketSelector(_filterScope));
    if (!bucket) {
      return null;
    }
    hostEl = bucket.querySelector(filterHostSelector(_activeFilterKey));
    if (!hostEl) {
      return null;
    }
    return hostEl.closest("." + SELECTORS.filterItemWrapperClass) || null;
  }

  function findScopedPopupMount(_activeFilterKey, _filterScope) {
    var wrapper = findScopedFilterWrapper(_activeFilterKey, _filterScope);
    var hostEl;
    var mount;
    if (!wrapper) {
      return null;
    }
    hostEl = wrapper.querySelector(filterHostSelector(_activeFilterKey));
    if (hostEl && hostEl.querySelector) {
      mount = hostEl.querySelector(SELECTORS.popupMountSelector);
      if (mount) {
        return mount;
      }
    }
    return wrapper.querySelector(SELECTORS.popupMountSelector);
  }

  function closestWrapper(_el) {
    return _el && _el.closest ? _el.closest("." + SELECTORS.filterItemWrapperClass) : null;
  }

  function readMatchingActiveFilterEl(_KDB, _activeFilterKey) {
    var refs = _KDB && _KDB.runtime && _KDB.runtime.filterDock ? _KDB.runtime.filterDock.domRefs : null;
    var activeFilterEl = refs ? refs.activeFilterEl : null;
    var attr = SELECTORS.filterDataIdAttr;
    var hits;
    if (!activeFilterEl || !activeFilterEl.isConnected || !activeFilterEl.closest) {
      return null;
    }
    if (!activeFilterEl.closest(SELECTORS.pageContextDockBucketSelector)) {
      return null;
    }
    if (activeFilterEl.getAttribute && activeFilterEl.getAttribute(attr) === _activeFilterKey) {
      return activeFilterEl;
    }
    hits = activeFilterEl.querySelectorAll ? activeFilterEl.querySelectorAll(filterHostSelector(_activeFilterKey)) : [];
    return hits.length ? activeFilterEl : null;
  }

  // The page-context dock can hold the same filter twice while a tab overlay is open; pick the overlay's wrapper.
  function resolveUniqueOtherDockFilterWrapper(_KDB, _activeFilterKey) {
    var bucket;
    var matches;
    var overlayWrapper;
    var idx;
    if (!_activeFilterKey || typeof document === "undefined") {
      return null;
    }
    bucket = document.querySelector(SELECTORS.pageContextDockBucketSelector);
    if (!bucket || !bucket.querySelectorAll) {
      return null;
    }
    matches = bucket.querySelectorAll(filterHostSelector(_activeFilterKey));
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
  }

  return {
    findScopedFilterWrapper: findScopedFilterWrapper,
    findScopedPopupMount: findScopedPopupMount,
    resolveUniqueOtherDockFilterWrapper: resolveUniqueOtherDockFilterWrapper
  };
});
