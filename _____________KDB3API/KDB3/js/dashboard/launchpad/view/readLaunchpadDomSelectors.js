define([], function () {
  function __controller(_KDB) {
    try {
      if (_KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.launchpad) {
        return _KDB.elements.selectors.launchpad;
      }

      return {
        hideSpotSelector: "#KDB_HideSpot",
        rootSelector: "#KDB_widgetLaunchpad",
        slotSelector: "[data-kdb-launchpad-pad][cor_page_id][cor_page_index]"
      };
    } catch (err) {
      console.error("[launchpad.readLaunchpadDomSelectors] failed", err);
      throw err;
    }
  }

  return __controller;
});
