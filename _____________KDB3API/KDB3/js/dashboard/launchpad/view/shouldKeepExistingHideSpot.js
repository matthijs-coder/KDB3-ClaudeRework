define([], function () {
  function __controller(_KDB, _hideSpotEl) {
    try {
      if (isLaunchpadReady(_KDB)) {
        return true;
      }
      return hasParkedWidgets(_hideSpotEl);
    } catch (err) {
      console.error("[launchpad.shouldKeepExistingHideSpot] failed", err);
      throw err;
    }
  }

  function isLaunchpadReady(_KDB) {
    try {
      const state = _KDB && _KDB.state ? _KDB.state.launchpad : null;
      return !!state && state.lifecycle === "ready" && state.domReady === true;
    } catch (err) {
      console.error("[launchpad.isLaunchpadReady] failed", err);
      throw err;
    }
  }

  function hasParkedWidgets(_hideSpotEl) {
    try {
      if (!_hideSpotEl || typeof _hideSpotEl.querySelectorAll !== "function") {
        return false;
      }
      const slots = _hideSpotEl.querySelectorAll("[data-kdb-launchpad-pad][cor_page_id][cor_page_index]");
      let index = 0;
      while (index < slots.length) {
        if (slots[index].children && slots[index].children.length > 0) {
          return true;
        }
        index += 1;
      }
      return false;
    } catch (err) {
      console.error("[launchpad.hasParkedWidgets] failed", err);
      throw err;
    }
  }

  return __controller;
});
