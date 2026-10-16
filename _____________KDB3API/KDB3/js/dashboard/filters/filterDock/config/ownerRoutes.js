// START HERE for filter-family routing.
define([], function () {
  "use strict";

  var SUPPORTED_FILTER_TYPES = {
    singleSelect: true,
    specialSingleSelect: true,
    sicht: true,
    dienststelle: true,
    nativeMultiSelect: true
  };

  var OWNER_ROUTE_MAP = {
    singleSelect: {
      apiKey: "singleSelect",
      needsFilterDockFiltersReady: true,
      allowDeprecatedScopeProjection: false,
      needsFilterDockCommittedDisplayResync: true,
      actionTypes: {
        stateChanged: "singleSelect/filterDockStateChanged",
        popupReady: "singleSelect/filterDockPopupReady",
        filtersReady: "singleSelect/reconcileFilterInstances",
        committedDisplayObserved: "singleSelect/filterDockCommittedDisplayObserved"
      }
    },
    specialSingleSelect: {
      apiKey: "specialSingleSelect",
      allowDeprecatedScopeProjection: true,
      actionTypes: {
        stateChanged: "specialSingleSelect/filterDockStateChanged",
        popupReady: "specialSingleSelect/filterDockPopupReady"
      }
    },
    sicht: {
      apiKey: "sicht",
      allowDeprecatedScopeProjection: true,
      actionTypes: {
        stateChanged: "sicht/filterDockStateChanged",
        popupReady: "sicht/filterDockPopupReady"
      }
    },
    dienststelle: {
      apiKey: "dienststelle",
      needsFilterDockFiltersReady: true,
      allowDeprecatedScopeProjection: true,
      needsFilterDockHeaderResync: true,
      needsFilterDockCommittedDisplayResync: true,
      needsPopupDisplayResync: true,
      actionTypes: {
        stateChanged: "dienststelle/filterDockStateChanged",
        popupReady: "dienststelle/filterDockPopupReady",
        filtersReady: "dienststelle/filterDockFiltersReady",
        headerObserved: "dienststelle/filterDockHeaderObserved",
        committedDisplayObserved: "dienststelle/filterDockCommittedDisplayObserved"
      }
    },
    nativeMultiSelect: {
      apiKey: "nativeMultiSelect",
      allowDeprecatedScopeProjection: false,
      actionTypes: {
        stateChanged: "nativeMultiSelect/filterDockStateChanged"
      }
    }
  };

  return {
    SUPPORTED_FILTER_TYPES: SUPPORTED_FILTER_TYPES,
    OWNER_ROUTE_MAP: OWNER_ROUTE_MAP
  };
});
