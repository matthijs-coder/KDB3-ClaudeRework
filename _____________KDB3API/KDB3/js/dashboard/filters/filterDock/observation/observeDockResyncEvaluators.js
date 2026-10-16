define([
  "./evaluateDockHeaderResync.js",
  "./evaluateDockCommittedDisplayResync.js",
  "./detectAndDispatchFiltersReady.js"
], function (
  _evaluateDockHeaderResync,
  _evaluateDockCommittedDisplayResync,
  _detectAndDispatchFiltersReady
) {
  "use strict";

  return {
    evaluateDockHeaderResync: _evaluateDockHeaderResync,
    evaluateDockCommittedDisplayResync: _evaluateDockCommittedDisplayResync,
    detectAndDispatchFiltersReady: _detectAndDispatchFiltersReady
  };
});
