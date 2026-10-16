define([], function () {
  "use strict";

  function readActiveFilterEl(_filterEl, _runtime) {
    if (_filterEl) {
      return _filterEl;
    }
    return _runtime && _runtime.domRefs ? _runtime.domRefs.activeFilterEl : null;
  }

  function __controller(_filterEl, _dockRoot, _selectors, _runtime) {
    var mountSelector = _selectors && _selectors.popupMountSelector;
    var activeFilterEl;
    if (!mountSelector) {
      return null;
    }
    activeFilterEl = readActiveFilterEl(_filterEl, _runtime);
    if (activeFilterEl && activeFilterEl.querySelector) {
      return activeFilterEl.querySelector(mountSelector);
    }
    if (_dockRoot && _dockRoot.querySelector) {
      return _dockRoot.querySelector(mountSelector);
    }
    return null;
  }

  return __controller;
});
