define([], function () {
  "use strict";

  function __controller(_KDB) {
    const launchpadState = readLaunchpadState(_KDB);
    const helperTabIds = launchpadState && Array.isArray(launchpadState.helperTabIds)
      ? launchpadState.helperTabIds
      : [];

    return helperTabIds.map(String);
  }

  function readLaunchpadState(_KDB) {
    const launchpadApi = _KDB && _KDB.api ? _KDB.api.launchpad : null;

    if (launchpadApi && typeof launchpadApi.getState === "function") {
      return launchpadApi.getState();
    }
    return _KDB && _KDB.state ? _KDB.state.launchpad : null;
  }

  return __controller;
});
