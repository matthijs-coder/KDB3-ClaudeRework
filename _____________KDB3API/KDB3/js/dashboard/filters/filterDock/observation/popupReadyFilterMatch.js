define([], function () {
  "use strict";

  function isPopupReady(_popup) {
    return !!(
      _popup &&
      _popup.isVisible === true &&
      _popup.hasOptions === true &&
      _popup.optionCount > 0
    );
  }

  function readActiveFilterKey(_popup, _lastClickedFilter) {
    if (_popup && _popup.activeFilterId) {
      return String(_popup.activeFilterId).trim();
    }
    if (_lastClickedFilter && _lastClickedFilter.filterKey) {
      return String(_lastClickedFilter.filterKey).trim();
    }
    if (_lastClickedFilter && _lastClickedFilter.filterId) {
      return String(_lastClickedFilter.filterId).trim();
    }
    return "";
  }

  function popupMatchesActiveFilter(_popup, _lastClickedFilter) {
    var activeFilterKey = readActiveFilterKey(_popup, _lastClickedFilter);
    if (!activeFilterKey || !_lastClickedFilter) {
      return false;
    }
    return (
      activeFilterKey === _lastClickedFilter.filterId ||
      activeFilterKey === _lastClickedFilter.filterKey ||
      activeFilterKey === _lastClickedFilter.filterLabel
    );
  }

  function isSingleSelectFamily(_lastClickedFilter) {
    var filterType = _lastClickedFilter && _lastClickedFilter.filterType;
    return (
      filterType === "singleSelect" ||
      filterType === "specialSingleSelect" ||
      filterType === "sicht"
    );
  }

  return {
    isPopupReady: isPopupReady,
    readActiveFilterKey: readActiveFilterKey,
    popupMatchesActiveFilter: popupMatchesActiveFilter,
    isSingleSelectFamily: isSingleSelectFamily
  };
});
