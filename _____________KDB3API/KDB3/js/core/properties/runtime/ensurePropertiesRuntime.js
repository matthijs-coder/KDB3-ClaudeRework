define([], function () {
  "use strict";

  function __controller(_KDB) {
    if (!_KDB.runtime) {
      _KDB.runtime = {};
    }

    if (!_KDB.runtime.properties) {
      _KDB.runtime.properties = {};
    }

    if (!_KDB.runtime.properties.subscriptions) {
      _KDB.runtime.properties.subscriptions = {};
    }

    return _KDB.runtime.properties;
  }

  return __controller;
});
