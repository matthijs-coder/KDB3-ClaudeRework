define([], function () {
  "use strict";

  function __controller(_KDB) {
    if (!_KDB.state || !_KDB.state.loading) {
      return;
    }

    const mountKeys = Object.keys(_KDB.state.loading);
    let index;
    let mountKey;

    for (index = 0; index < mountKeys.length; index += 1) {
      mountKey = mountKeys[index];
      _KDB.state.loading[mountKey].activeCount = 0;
      _KDB.state.loading[mountKey].isActive = false;
    }
  }

  return __controller;
});
