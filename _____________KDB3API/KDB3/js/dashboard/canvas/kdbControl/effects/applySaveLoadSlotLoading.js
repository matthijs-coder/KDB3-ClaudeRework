define([], function () {
  "use strict";

  const MOUNT_KEY = "kdb-control-save-load-slot-loading";
  const SLOT_LOADING_TIMEOUT_MS = 30000;
  const RUNTIME_KEY = "saveLoadSlotLoading";

  function __controller(_KDB, _slotEl) {
    try {
      startSaveLoadSlotLoading(_KDB, _slotEl);
    } catch (err) {
      console.error("[kdbControl.applySaveLoadSlotLoading] failed", err);
    }
  }

  function startSaveLoadSlotLoading(_KDB, _slotEl) {
    try {
      if (!_KDB || !_slotEl || _slotEl.nodeType !== 1) {
        return;
      }
      finishSaveLoadSlotLoading(_KDB);
      const loading = _KDB.services && _KDB.services.loading;
      if (!loading || typeof loading.startLoading !== "function") {
        return;
      }
      const handle = loading.startLoading({
        mountEl: _slotEl,
        mountKey: MOUNT_KEY,
        messageKey: "parameterSelect"
      });
      if (!handle) {
        return;
      }
      if (hasForeignSlotChild(_slotEl)) {
        finishSaveLoadSlotLoading(_KDB);
        return;
      }
      const runtime = ensureKdbControlRuntimeBuckets(_KDB);
      if (!runtime) {
        finishSaveLoadSlotLoading(_KDB);
        return;
      }
      const observer = new MutationObserver(onSaveLoadSlotMutations.bind(null, _KDB));
      runtime.observers[RUNTIME_KEY] = observer;
      observer.observe(_slotEl, { childList: true });
      if (hasForeignSlotChild(_slotEl)) {
        finishSaveLoadSlotLoading(_KDB);
        return;
      }
      runtime.timers[RUNTIME_KEY] = setTimeout(
        onSaveLoadSlotTimeout.bind(null, _KDB),
        SLOT_LOADING_TIMEOUT_MS
      );
      runtime.listeners[RUNTIME_KEY] = finishSaveLoadSlotLoading.bind(null, _KDB);
    } catch (err) {
      console.error("[kdbControl.applySaveLoadSlotLoading.start] failed", err);
    }
  }

  function hasForeignSlotChild(_slotEl) {
    try {
      return Boolean(_slotEl && _slotEl.querySelector(":scope > :not(.loadingIndicatorContainer)"));
    } catch (err) {
      console.error("[kdbControl.applySaveLoadSlotLoading.hasForeignSlotChild] failed", err);
      return false;
    }
  }

  function onSaveLoadSlotMutations(_KDB) {
    try {
      const slotEl = readSaveLoadSlotEl(_KDB);
      if (hasForeignSlotChild(slotEl)) {
        finishSaveLoadSlotLoading(_KDB);
      }
    } catch (err) {
      console.error("[kdbControl.applySaveLoadSlotLoading.observe] failed", err);
    }
  }

  function onSaveLoadSlotTimeout(_KDB) {
    try {
      finishSaveLoadSlotLoading(_KDB);
    } catch (err) {
      console.error("[kdbControl.applySaveLoadSlotLoading.timeout] failed", err);
    }
  }

  function readSaveLoadSlotEl(_KDB) {
    const dr = _KDB && _KDB.runtime && _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.domRefs;
    return (dr && dr.saveLoadSlotEl) || null;
  }

  function ensureKdbControlRuntimeBuckets(_KDB) {
    if (!_KDB.runtime) {
      return null;
    }
    _KDB.runtime.kdbControl = _KDB.runtime.kdbControl || {};
    const rt = _KDB.runtime.kdbControl;
    rt.observers = rt.observers || {};
    rt.timers = rt.timers || {};
    rt.listeners = rt.listeners || {};
    return rt;
  }

  function finishSaveLoadSlotLoading(_KDB) {
    try {
      const rt = _KDB && _KDB.runtime && _KDB.runtime.kdbControl;
      if (rt && rt.observers && rt.observers[RUNTIME_KEY]) {
        const observer = rt.observers[RUNTIME_KEY];
        if (observer && typeof observer.disconnect === "function") {
          observer.disconnect();
        }
        delete rt.observers[RUNTIME_KEY];
      }
      if (rt && rt.timers && rt.timers[RUNTIME_KEY] != null) {
        clearTimeout(rt.timers[RUNTIME_KEY]);
        delete rt.timers[RUNTIME_KEY];
      }
      if (rt && rt.listeners) {
        delete rt.listeners[RUNTIME_KEY];
      }
      const loading = _KDB && _KDB.services && _KDB.services.loading;
      if (loading && typeof loading.finishLoading === "function") {
        loading.finishLoading({ mountKey: MOUNT_KEY });
      }
    } catch (err) {
      console.error("[kdbControl.applySaveLoadSlotLoading.finish] failed", err);
    }
  }

  return __controller;
});
