define([], function () {
  "use strict";

  var CLASS_SINGLE_SELECT = "KDB_singleSelectFilter";
  var CLASS_CASCADING = "KDB_cascadingFilter";
  var CLASS_SICHT = "KDB_sichtSingleSelect";
  var CLASS_HIERARCHY = "KDB_hierarchyFilter";
  var CLASS_HIDE_ALLE = "KDB_hideAlleOption";

  function syncFilterWrapperClasses(_filterEl, _identity) {
    var capabilities;
    var filterType;
    var condition;
    var isSicht;
    if (!_filterEl || !_identity) {
      return;
    }
    capabilities = _identity.capabilities || {};
    filterType = _identity.filterType;
    condition = capabilities.condition;
    isSicht = filterType === "sicht" || capabilities.isSicht === true;

    if (
      filterType === "singleSelect" ||
      filterType === "specialSingleSelect" ||
      filterType === "sicht"
    ) {
      _filterEl.classList.add(CLASS_SINGLE_SELECT);
    }
    if (isSicht) {
      _filterEl.classList.add(CLASS_SICHT);
    }
    if (capabilities.isUpstream === true && !isSicht) {
      _filterEl.classList.add(CLASS_CASCADING);
    }
    if (capabilities.isHierarchy === true) {
      _filterEl.classList.add(CLASS_HIERARCHY);
    }
    if (condition != null && String(condition).trim() !== "") {
      _filterEl.classList.toggle(CLASS_HIDE_ALLE, capabilities.hasAlleOption !== true);
    }
  }

  return syncFilterWrapperClasses;
});
