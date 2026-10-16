// START HERE for filter-family routing.
define([], function () {
  "use strict";

  var OWNER_ROUTE_MAP = {
    singleSelect: {
      apiKey: "singleSelect",
      needsFilterDockFiltersReady: true,
      allowDeprecatedScopeProjection: false,
      needsFilterDockCommittedDisplayResync: true,
      isSingleSelectFamily: true,
      ownedClassPattern: /\bKDB_selectedOption\b|\bKDB_singleSelect/,
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
      isSingleSelectFamily: true,
      actionTypes: {
        stateChanged: "specialSingleSelect/filterDockStateChanged",
        popupReady: "specialSingleSelect/filterDockPopupReady"
      }
    },
    sicht: {
      apiKey: "sicht",
      allowDeprecatedScopeProjection: true,
      isSingleSelectFamily: true,
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
      ownedClassPattern: new RegExp(
        "\\bKDB_dienststelle\\b|\\bKDB_dienststelle_active\\b|\\bKDB_dienststelleActive_BW\\b" +
          "|\\bKDB_dienststelleActive_DEZPV\\b|\\bKDB_dienststelle_popupLabelsReady\\b"
      ),
      hostDataIdVariants: ["Dienststelle_BW", "Dienststelle_DEZPV"],
      skipPopupDisplayResyncHostIds: ["Dienststelle_BW"],
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
      receivesOutsideDockClicks: true,
      actionTypes: {
        stateChanged: "nativeMultiSelect/filterDockStateChanged"
      }
    }
  };

  function readOwnerRoute(filterType) {
    return Object.prototype.hasOwnProperty.call(OWNER_ROUTE_MAP, filterType) ? OWNER_ROUTE_MAP[filterType] : null;
  }

  function ownerNeedsPopupDisplayResync(filterType) {
    var route = readOwnerRoute(filterType);
    return !!(route && route.needsPopupDisplayResync === true);
  }

  function isSingleSelectFamily(filterType) {
    var route = readOwnerRoute(filterType);
    return !!(route && route.isSingleSelectFamily === true);
  }

  function receivesOutsideDockClicks(filterType) {
    var route = readOwnerRoute(filterType);
    return !!(route && route.receivesOutsideDockClicks === true);
  }

  function isKdbOwnedClassName(className) {
    return Object.keys(OWNER_ROUTE_MAP).some(function (key) {
      var pattern = OWNER_ROUTE_MAP[key].ownedClassPattern;
      return !!pattern && pattern.test(className);
    });
  }

  function skipsPopupDisplayResync(filterType, hostDataId) {
    var route = readOwnerRoute(filterType);
    return !!(route && route.skipPopupDisplayResyncHostIds && route.skipPopupDisplayResyncHostIds.indexOf(hostDataId) !== -1);
  }

  function readHostDataIdVariants(filterType) {
    var route = readOwnerRoute(filterType);
    return route && route.hostDataIdVariants ? route.hostDataIdVariants : [];
  }

  return {
    OWNER_ROUTE_MAP: OWNER_ROUTE_MAP,
    readOwnerRoute: readOwnerRoute,
    ownerNeedsPopupDisplayResync: ownerNeedsPopupDisplayResync,
    isSingleSelectFamily: isSingleSelectFamily,
    receivesOutsideDockClicks: receivesOutsideDockClicks,
    isKdbOwnedClassName: isKdbOwnedClassName,
    skipsPopupDisplayResync: skipsPopupDisplayResync,
    readHostDataIdVariants: readHostDataIdVariants
  };
});
