define(["./resolvePopupMount.js", "./resolveScopedPopupMount.js"], function (
  _resolvePopupMount,
  _resolveScopedPopupMount
) {
  "use strict";

  function resolvePopupRoot(_filterEl, _dockRoot, _selectors, _runtime, _scopeContext) {
    if (_scopeContext && _scopeContext.scopeType && _scopeContext.hostDataId) {
      return _resolveScopedPopupMount({
        filterEl: _filterEl,
        dockRoot: _dockRoot,
        selectors: _selectors,
        runtime: _runtime,
        scopeType: _scopeContext.scopeType,
        hostDataId: _scopeContext.hostDataId
      });
    }
    return _resolvePopupMount(_filterEl, _dockRoot, _selectors, _runtime);
  }

  function __controller(
    _filterEl,
    _dockRoot,
    _selectors,
    _filterId,
    _filterType,
    _observedAt,
    _runtime,
    _scopeContext
  ) {
    var popupRoot = resolvePopupRoot(_filterEl, _dockRoot, _selectors, _runtime, _scopeContext);
    var optionCount =
      popupRoot && _selectors.optionSelector
        ? popupRoot.querySelectorAll(_selectors.optionSelector).length
        : 0;
    if (popupRoot && _runtime && _runtime.domRefs) {
      _runtime.domRefs.activePopupEl = popupRoot;
    }
    return {
      isVisible: !!popupRoot,
      activeFilterId: _filterId || null,
      activeFilterType: _filterType || null,
      hasOptions: optionCount > 0,
      optionCount: optionCount,
      hasOkButton: !!(
        popupRoot &&
        _selectors.okButtonSelector &&
        popupRoot.querySelector(_selectors.okButtonSelector)
      ),
      hasCancelButton: !!(
        popupRoot &&
        _selectors.cancelButtonSelector &&
        popupRoot.querySelector(_selectors.cancelButtonSelector)
      ),
      observedAt: _observedAt
    };
  }

  return __controller;
});
