define([], function () {
  "use strict";

  function __controller(_KDB, _mountKey) {
    _KDB.state = _KDB.state || {};
    _KDB.state.loading = _KDB.state.loading || {};
    _KDB.state.loading[_mountKey] = _KDB.state.loading[_mountKey] || { activeCount: 0, isActive: false };

    return _KDB.state.loading[_mountKey];
  }

  return __controller;
});
