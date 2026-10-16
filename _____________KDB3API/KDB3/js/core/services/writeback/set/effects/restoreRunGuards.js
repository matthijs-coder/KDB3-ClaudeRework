define([
  "./historyGuards.js",
  "./loadingGuards.js"
], function (_historyGuards, _loadingGuards) {
  "use strict";

  return {
    historyBeginGuarded: _historyGuards.historyBeginGuarded,
    historyFinishGuarded: _historyGuards.historyFinishGuarded,
    startLoadingGuarded: _loadingGuards.startLoadingGuarded,
    finishLoadingGuarded: _loadingGuards.finishLoadingGuarded
  };
});
