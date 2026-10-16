define(["./readFilterLabel.js", "./resolveHostDataId.js"], function (_readFilterLabel, _resolveHostDataId) {
  "use strict";

  function readActiveFilterEl(_filterEl, _runtime) {
    if (_filterEl) {
      return _filterEl;
    }
    return _runtime && _runtime.domRefs ? _runtime.domRefs.activeFilterEl : null;
  }

  function resolveBucketSelector(_scopeType, _selectors) {
    if (_scopeType === "global") {
      return _selectors.globalDockSelector;
    }
    return _selectors.pageContextDockSelector;
  }

  function activeFilterElMatchesScope(_activeFilterEl, _scopeType, _selectors, _hostDataId) {
    var bucketSelector;
    if (!_activeFilterEl || !_hostDataId) {
      return false;
    }
    bucketSelector = resolveBucketSelector(_scopeType, _selectors);
    if (!bucketSelector || !_activeFilterEl.closest) {
      return false;
    }
    if (!_activeFilterEl.closest(bucketSelector)) {
      return false;
    }
    return _readFilterLabel.readFilterLabel(_activeFilterEl, _selectors) === _hostDataId;
  }

  function resolveFromBucket(_dockRoot, _scopeType, _selectors, _hostDataId, _mountSelector) {
    var bucketSelector;
    var bucket;
    var hostEl;
    var wrapper;
    var filterItemSelector;
    if (!_dockRoot || !_hostDataId || !_mountSelector) {
      return null;
    }
    bucketSelector = resolveBucketSelector(_scopeType, _selectors);
    if (!bucketSelector) {
      return null;
    }
    bucket = _dockRoot.querySelector(bucketSelector);
    if (!bucket || !_selectors.filterDataIdAttr) {
      return null;
    }
    hostEl = bucket.querySelector("[" + _selectors.filterDataIdAttr + "=\"" + _hostDataId + "\"]");
    if (!hostEl) {
      return null;
    }
    filterItemSelector = _selectors.filterItemSelector;
    if (!filterItemSelector) {
      return null;
    }
    wrapper = hostEl.closest(filterItemSelector);
    if (!wrapper) {
      return null;
    }
    return wrapper.querySelector(_mountSelector);
  }

  function __controller(_context) {
    var mountSelector;
    var activeFilterEl;
    if (!_context || !_context.selectors || !_context.hostDataId || !_context.scopeType) {
      return null;
    }
    mountSelector = _context.selectors.popupMountSelector;
    if (!mountSelector) {
      return null;
    }
    activeFilterEl = readActiveFilterEl(_context.filterEl, _context.runtime);
    if (
      activeFilterElMatchesScope(
        activeFilterEl,
        _context.scopeType,
        _context.selectors,
        _context.hostDataId
      )
    ) {
      return activeFilterEl.querySelector(mountSelector);
    }
    return resolveFromBucket(
      _context.dockRoot,
      _context.scopeType,
      _context.selectors,
      _context.hostDataId,
      mountSelector
    );
  }

  function buildScopeContext(_lastClickedFilter, _selectors, _runtime) {
    var scopeType =
      _lastClickedFilter &&
      (_lastClickedFilter.scopeType || _lastClickedFilter.filterScope);
    var hostDataId = _resolveHostDataId(_lastClickedFilter, _selectors, _runtime);
    if (!scopeType || !hostDataId) {
      return null;
    }
    return {
      scopeType: scopeType,
      hostDataId: hostDataId
    };
  }

  __controller.buildScopeContext = buildScopeContext;

  return __controller;
});
