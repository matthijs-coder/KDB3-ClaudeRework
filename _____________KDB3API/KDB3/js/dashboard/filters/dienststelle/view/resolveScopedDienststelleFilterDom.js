define(["../config/selectors.js"], function (_selectors) {
  "use strict";

  function readFilterScopeBucket(_filterScope) {
    return _filterScope === "global" ? "global" : "pageContext";
  }

  function resolveBucketSelector(_filterScope) {
    var bucket = readFilterScopeBucket(_filterScope);
    if (bucket === "global") {
      return _selectors.globalDockBucketSelector;
    }
    return _selectors.pageContextDockBucketSelector;
  }

  function findScopedFilterWrapper(_activeFilterKey, _filterScope) {
    var dockRoot;
    var bucket;
    var hostEl;
    var wrapper;
    if (!_activeFilterKey || typeof document === "undefined") {
      return null;
    }
    dockRoot = document.querySelector(_selectors.filterDockRootSelector);
    if (!dockRoot) {
      return null;
    }
    bucket = dockRoot.querySelector(resolveBucketSelector(_filterScope));
    if (!bucket) {
      return null;
    }
    hostEl = bucket.querySelector(
      "[" + _selectors.filterDataIdAttr + '="' + _activeFilterKey + '"]'
    );
    if (!hostEl) {
      return null;
    }
    wrapper = hostEl.closest("." + _selectors.filterItemWrapperClass);
    return wrapper || null;
  }

  function findScopedPopupMount(_activeFilterKey, _filterScope) {
    var hostEl;
    var mount;
    var wrapper = findScopedFilterWrapper(_activeFilterKey, _filterScope);
    if (!wrapper) {
      return null;
    }
    hostEl = wrapper.querySelector(
      "[" + _selectors.filterDataIdAttr + '="' + _activeFilterKey + '"]'
    );
    if (hostEl && hostEl.querySelector) {
      mount = hostEl.querySelector(_selectors.popupMountSelector);
      if (mount) {
        return mount;
      }
    }
    return wrapper.querySelector(_selectors.popupMountSelector);
  }

  return {
    readFilterScopeBucket: readFilterScopeBucket,
    findScopedFilterWrapper: findScopedFilterWrapper,
    findScopedPopupMount: findScopedPopupMount
  };
});
