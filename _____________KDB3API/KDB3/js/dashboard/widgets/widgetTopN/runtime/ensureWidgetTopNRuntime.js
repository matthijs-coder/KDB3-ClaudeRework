define([], function () {
  "use strict";

  function createOwnerRuntimeRecord() {
    return {
      abortControllers: {},
      pendingPromises: {},
      timers: {},
      opSeq: 0,
      helperWidgetId: null,
      claimToken: null,
      helperManagedFilterItemIds: [],
      lastHelperPlan: null,
      lastHelperDataConfig: null
    };
  }

  function ensureRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.widgetTopN = _KDB.runtime.widgetTopN || {};
    var runtime = _KDB.runtime.widgetTopN;
    runtime.abortControllers = runtime.abortControllers || {};
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.timers = runtime.timers || {};
    runtime.byOwner = runtime.byOwner || {};
    return runtime;
  }

  function ensureOwnerRuntime(_KDB, _ownerVisId) {
    var runtime = ensureRuntime(_KDB);
    if (!runtime.byOwner[_ownerVisId]) {
      runtime.byOwner[_ownerVisId] = createOwnerRuntimeRecord();
    }
    return runtime.byOwner[_ownerVisId];
  }

  function cleanupRuntime(_KDB) {
    var runtime = ensureRuntime(_KDB);
    abortControllerMap(runtime.abortControllers);
    cleanupOwnerRuntimes(runtime.byOwner);
    runtime.abortControllers = {};
    runtime.pendingPromises = {};
    runtime.timers = {};
    runtime.byOwner = {};
  }

  function beginOwnerResolve(_KDB, _ownerVisId, _requestedOpSeq) {
    var ownerRuntime = ensureOwnerRuntime(_KDB, _ownerVisId);
    if (typeof _requestedOpSeq === "number" && _requestedOpSeq < ownerRuntime.opSeq) {
      return _requestedOpSeq;
    }
    abortOwnerResolve(ownerRuntime);
    ownerRuntime.abortControllers.resolve = createAbortController();
    if (typeof _requestedOpSeq === "number") {
      ownerRuntime.opSeq = _requestedOpSeq;
      return _requestedOpSeq;
    }
    ownerRuntime.opSeq = (ownerRuntime.opSeq || 0) + 1;
    return ownerRuntime.opSeq;
  }

  function isOwnerOpSeqStale(_KDB, _ownerVisId, _opSeq) {
    var runtime = ensureRuntime(_KDB);
    var ownerRuntime = runtime.byOwner[_ownerVisId];
    if (!ownerRuntime || typeof _opSeq !== "number") {
      return false;
    }
    return ownerRuntime.opSeq !== _opSeq;
  }

  function abortOwnerResolve(ownerRuntime) {
    abortController(ownerRuntime && ownerRuntime.abortControllers ? ownerRuntime.abortControllers.resolve : null);
    if (ownerRuntime && ownerRuntime.abortControllers) {
      delete ownerRuntime.abortControllers.resolve;
    }
  }

  function cleanupOwnerRuntimes(byOwner) {
    var ownerIds = Object.keys(byOwner || {});
    var index = 0;
    while (index < ownerIds.length) {
      cleanupOwnerRuntime(byOwner[ownerIds[index]]);
      index += 1;
    }
  }

  function cleanupOwnerRuntime(ownerRuntime) {
    abortControllerMap(ownerRuntime.abortControllers || {});
    clearTimerMap(ownerRuntime.timers || {});
    ownerRuntime.abortControllers = {};
    ownerRuntime.pendingPromises = {};
    ownerRuntime.timers = {};
    ownerRuntime.helperManagedFilterItemIds = [];
    ownerRuntime.lastHelperPlan = null;
    ownerRuntime.lastHelperDataConfig = null;
  }

  function abortControllerMap(map) {
    var keys = Object.keys(map || {});
    var index = 0;
    while (index < keys.length) {
      abortController(map[keys[index]]);
      index += 1;
    }
  }

  function clearTimerMap(map) {
    var keys = Object.keys(map || {});
    var index = 0;
    while (index < keys.length) {
      clearTimeout(map[keys[index]]);
      index += 1;
    }
  }

  function abortController(controller) {
    if (controller && typeof controller.abort === "function") {
      controller.abort();
    }
  }

  function createAbortController() {
    if (typeof AbortController === "function") {
      return new AbortController();
    }
    return { signal: { aborted: false }, abort: markFallbackAborted };
  }

  function markFallbackAborted() {
    this.signal.aborted = true;
  }

  return {
    ensureRuntime: ensureRuntime,
    ensureOwnerRuntime: ensureOwnerRuntime,
    cleanupRuntime: cleanupRuntime,
    beginOwnerResolve: beginOwnerResolve,
    isOwnerOpSeqStale: isOwnerOpSeqStale,
    abortOwnerResolve: abortOwnerResolve
  };
});
