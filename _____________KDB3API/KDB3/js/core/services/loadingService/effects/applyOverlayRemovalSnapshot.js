define([
  "../runtime/ensureLoadingRuntime.js",
  "../../../cognosHost/config/rootChromeSelectors.js"
], function (_ensureLoadingRuntime, _rootChrome) {
  "use strict";

  function __controller(_KDB, _mountKey) {
    try {
      const runtime = _ensureLoadingRuntime(_KDB);
      const snapshot = runtime.domRefs.pendingRemovalByMountKey[_mountKey];
      if (!snapshot) {
        return false;
      }

      clearTimeout(runtime.timers.removeDelaysByMountKey[_mountKey]);
      delete runtime.timers.removeDelaysByMountKey[_mountKey];

      const spinnerSelector = resolveSpinnerSelector(_KDB);
      const spinnerEl = snapshot.spinnerEl || (snapshot.mountEl && snapshot.mountEl.querySelector(spinnerSelector));
      if (spinnerEl && spinnerEl.parentNode) {
        spinnerEl.parentNode.removeChild(spinnerEl);
      }

      restoreSnapshotMount(snapshot);
      cleanupLiveRefs(runtime.domRefs, _mountKey, snapshot, spinnerEl);
      delete runtime.domRefs.pendingRemovalByMountKey[_mountKey];
      return true;
    } catch (err) {
      console.error("[loadingService.applyOverlayRemovalSnapshot] failed", { mountKey: _mountKey }, err);
      throw err;
    }
  }

  function resolveSpinnerSelector(_KDB) {
    const rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.root
      : null;
    return rootSelectors && rootSelectors.loadingIndicatorSelector
      ? rootSelectors.loadingIndicatorSelector
      : _rootChrome.root.strings.loadingIndicatorSelector;
  }

  function restoreSnapshotMount(snapshot) {
    if (!snapshot.mountEl) {
      return;
    }
    if (snapshot.mountEl.classList) {
      snapshot.mountEl.classList.remove("KDB_loading");
    }
    if (snapshot.hadPositionOverride === true) {
      snapshot.mountEl.style.position = snapshot.originalPosition;
    }
  }

  function cleanupLiveRefs(domRefs, mountKey, snapshot, spinnerEl) {
    if (domRefs.mountsByMountKey[mountKey] === snapshot.mountEl) {
      delete domRefs.mountsByMountKey[mountKey];
      delete domRefs.positionOverridesByMountKey[mountKey];
    }
    if (domRefs.spinnersByMountKey[mountKey] === snapshot.spinnerEl ||
        domRefs.spinnersByMountKey[mountKey] === spinnerEl) {
      delete domRefs.spinnersByMountKey[mountKey];
    }
  }

  return __controller;
});
