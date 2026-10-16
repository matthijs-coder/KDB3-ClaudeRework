define([
  "../runtime/ensureLoadingRuntime.js",
  "./applyOverlayRemovalSnapshot.js"
], function (_ensureLoadingRuntime, _applyOverlayRemovalSnapshot) {
  "use strict";

  function __controller(_KDB, _options) {
    let mountKey;
    try {
      const mountEl = resolveMountElement(_KDB, _options);
      mountKey = resolveMountKey(mountEl, _options);
      const runtime = _ensureLoadingRuntime(_KDB);
      const snapshot = runtime.domRefs.pendingRemovalByMountKey[mountKey];
      if (!snapshot) {
        return;
      }
      if (mountEl && snapshot.mountEl === mountEl) {
        clearTimeout(runtime.timers.removeDelaysByMountKey[mountKey]);
        delete runtime.timers.removeDelaysByMountKey[mountKey];
        delete runtime.domRefs.pendingRemovalByMountKey[mountKey];
        return;
      }
      _applyOverlayRemovalSnapshot(_KDB, mountKey);
    } catch (err) {
      console.error("[loadingService.reconcilePendingOverlayRemoval] failed", { mountKey: mountKey }, err);
      throw err;
    }
  }

  function resolveMountElement(_KDB, _options) {
    if (_options && _options.mountEl && _options.mountEl.nodeType === 1) {
      return _options.mountEl;
    }
    return (_KDB.elements && _KDB.elements.kdbWidget) || null;
  }

  function resolveMountKey(_mountEl, _options) {
    if (_options && typeof _options.mountKey === "string" && _options.mountKey.length > 0) {
      return _options.mountKey;
    }
    if (_mountEl && typeof _mountEl.id === "string" && _mountEl.id.length > 0) {
      return _mountEl.id;
    }
    return "kdb-root-loading";
  }

  return __controller;
});
