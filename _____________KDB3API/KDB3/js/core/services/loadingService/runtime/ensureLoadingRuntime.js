define([], function () {
  "use strict";

  function __controller(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.loadingService = _KDB.runtime.loadingService || {};
    _KDB.runtime.loadingService.timers = _KDB.runtime.loadingService.timers || {};
    _KDB.runtime.loadingService.domRefs = _KDB.runtime.loadingService.domRefs || {};

    _KDB.runtime.loadingService.timers.watchdogsByMountKey = _KDB.runtime.loadingService.timers.watchdogsByMountKey || {};
    _KDB.runtime.loadingService.timers.removeDelaysByMountKey = _KDB.runtime.loadingService.timers.removeDelaysByMountKey || {};
    _KDB.runtime.loadingService.domRefs.mountsByMountKey = _KDB.runtime.loadingService.domRefs.mountsByMountKey || {};
    _KDB.runtime.loadingService.domRefs.spinnersByMountKey = _KDB.runtime.loadingService.domRefs.spinnersByMountKey || {};
    _KDB.runtime.loadingService.domRefs.positionOverridesByMountKey = _KDB.runtime.loadingService.domRefs.positionOverridesByMountKey || {};
    _KDB.runtime.loadingService.domRefs.pendingRemovalByMountKey = _KDB.runtime.loadingService.domRefs.pendingRemovalByMountKey || {};

    return _KDB.runtime.loadingService;
  }

  return __controller;
});
