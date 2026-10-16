define(["../../utils/kit/runtime.js"], function (_rt) {
  "use strict";

  var TIMER_MAPS = ["watchdogsByMountKey", "removeDelaysByMountKey"];
  var DOM_MAPS = ["mountsByMountKey", "spinnersByMountKey", "positionOverridesByMountKey", "pendingRemovalByMountKey"];

  // Nested per-mount maps are owner fields: the kit resets the buckets on dispose, so callers re-run this.
  function ensureLoadingRuntime(_KDB) {
    var runtime = _rt.ensureRuntime(_KDB, "loadingService");
    TIMER_MAPS.forEach(function (name) { runtime.timers[name] = runtime.timers[name] || {}; });
    DOM_MAPS.forEach(function (name) { runtime.domRefs[name] = runtime.domRefs[name] || {}; });
    runtime.watchdogHandlersByMountKey = runtime.watchdogHandlersByMountKey || {};
    return runtime;
  }

  function ensureLoadingEntry(_KDB, mountKey) {
    _KDB.state = _KDB.state || {};
    _KDB.state.loading = _KDB.state.loading || {};
    _KDB.state.loading[mountKey] = _KDB.state.loading[mountKey] || { activeCount: 0, isActive: false };
    return _KDB.state.loading[mountKey];
  }

  function markLoadingStarted(_KDB, mountKey) {
    var entry = ensureLoadingEntry(_KDB, mountKey);
    entry.activeCount += 1;
    entry.isActive = true;
    return entry;
  }

  function markLoadingFinished(_KDB, mountKey) {
    var entry = ensureLoadingEntry(_KDB, mountKey);
    entry.activeCount = Math.max(0, entry.activeCount - 1);
    if (entry.activeCount === 0) {
      entry.isActive = false;
    }
    return entry;
  }

  // A finished mount key carries no information (readers treat a missing entry as "not loading"); dropping it
  // keeps _KDB.state.loading from growing with every widget id that ever loaded.
  function pruneFinishedLoading(_KDB, mountKey) {
    var loading = _KDB.state && _KDB.state.loading;
    if (loading && loading[mountKey] && loading[mountKey].activeCount === 0) {
      delete loading[mountKey];
    }
  }

  function isLoadingActive(_KDB, mountKey) {
    var entry = _KDB.state && _KDB.state.loading ? _KDB.state.loading[mountKey] : null;
    return !!entry && entry.isActive === true;
  }

  function markAllLoadingDisposed(_KDB) {
    var loading = _KDB.state && _KDB.state.loading;
    Object.keys(loading || {}).forEach(function (mountKey) {
      loading[mountKey].activeCount = 0;
      loading[mountKey].isActive = false;
    });
  }

  return {
    isLoadingActive: isLoadingActive,
    ensureLoadingRuntime: ensureLoadingRuntime,
    markAllLoadingDisposed: markAllLoadingDisposed,
    markLoadingFinished: markLoadingFinished,
    pruneFinishedLoading: pruneFinishedLoading,
    markLoadingStarted: markLoadingStarted
  };
});
