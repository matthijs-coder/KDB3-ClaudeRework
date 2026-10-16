define([], function () {
  "use strict";

  // Hands each feature's replay contribution (runtime.<name>.historyReplayHandlerContribution) to the history
  // service under the feature's manifest replay keys, in manifest replay order. Features without a usable
  // contribution (no apply function) are skipped.
  function registerReplayHandlers(_KDB, _manifest) {
    const history = _KDB.services && _KDB.services.history;
    if (!history || typeof history.registerReplayHandler !== "function") {
      console.warn("[bootstrap.registerReplayHandlers] services.history.registerReplayHandler is missing");
      return;
    }
    const entriesByName = {};
    _manifest.entries.forEach(function (entry) {
      entriesByName[entry.name] = entry;
    });
    _manifest.replayOrder.forEach(function (name) {
      const ownerRuntime = _KDB.runtime && _KDB.runtime[name];
      const contribution = ownerRuntime && ownerRuntime.historyReplayHandlerContribution;
      if (!contribution || typeof contribution.apply !== "function") {
        return;
      }
      entriesByName[name].replayKeys.forEach(function (key) {
        history.registerReplayHandler(key, contribution);
      });
    });
  }

  return registerReplayHandlers;
});
