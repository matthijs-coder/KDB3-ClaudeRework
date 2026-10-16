define([], function () {
  "use strict";

  function destroyHomeDialog(_KDB) {
    var runtime = _KDB.runtime && _KDB.runtime.homeDialog;
    if (runtime && typeof runtime.unregisterWatchdog === "function") {
      runtime.unregisterWatchdog();
    }
    if (_KDB.runtime) {
      _KDB.runtime.homeDialog = null;
    }
  }

  return destroyHomeDialog;
});
