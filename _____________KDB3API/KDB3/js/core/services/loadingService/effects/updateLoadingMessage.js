define([
  "./resolveLoadingMessage.js",
  "./syncLoadingCaption.js"
], function (_resolveLoadingMessage, _syncLoadingCaption) {
  "use strict";

  function __controller(_KDB, _options) {
    try {
      var handle;
      var mountKey;
      var entry;
      var runtime;
      var spinnerEl;
      var mountEl;
      var caption;
      if (!_KDB || typeof _KDB !== "object") {
        return false;
      }
      handle = _options && _options.handle;
      mountKey = (handle && handle.mountKey) || (_options && _options.mountKey);
      if (typeof mountKey !== "string" || mountKey.length === 0) {
        return false;
      }
      entry = _KDB.state && _KDB.state.loading ? _KDB.state.loading[mountKey] : null;
      if (!entry || entry.isActive !== true) {
        return false;
      }
      runtime = _KDB.runtime && _KDB.runtime.loadingService ? _KDB.runtime.loadingService : null;
      spinnerEl = runtime && runtime.domRefs && runtime.domRefs.spinnersByMountKey
        ? runtime.domRefs.spinnersByMountKey[mountKey]
        : null;
      if (!spinnerEl) {
        return false;
      }
      mountEl = handle && handle.mountEl && handle.mountEl.nodeType === 1
        ? handle.mountEl
        : (runtime.domRefs && runtime.domRefs.mountsByMountKey
          ? runtime.domRefs.mountsByMountKey[mountKey]
          : null);
      if (!mountEl || spinnerEl.parentNode !== mountEl) {
        return false;
      }
      caption = _resolveLoadingMessage(_KDB, _options);
      _syncLoadingCaption(spinnerEl, caption);
      return true;
    } catch (error) {
      console.error("[loadingService.updateLoadingMessage] failed", error);
      return false;
    }
  }

  return __controller;
});
