define([], function () {
  "use strict";

  function isAcceptedFilterType(_filterType) {
    try {
      return _filterType === "singleSelect" ||
        _filterType === "specialSingleSelect" ||
        _filterType === "sicht";
    } catch (error) {
      console.error("[singleSelect.validateFilterDockHandoff] filter type validation failed", error);
      throw error;
    }
  }

  function needsSpecialRightsData(_handoff) {
    try {
      var conditionKey = String(
        (_handoff && _handoff.capabilities
          ? _handoff.capabilities.condition : "") || ""
      ).trim().toLowerCase();
      return _handoff.filterType === "specialSingleSelect" &&
        _handoff.authorizedByOwner !== "specialSingleSelect" &&
        (conditionKey === "personengruppe" ||
          conditionKey === "dienststellenleitung");
    } catch (error) {
      console.error("[singleSelect.validateFilterDockHandoff] special rights validation failed", error);
      throw error;
    }
  }

  return {
    isAcceptedFilterType: isAcceptedFilterType,
    needsSpecialRightsData: needsSpecialRightsData
  };
});
