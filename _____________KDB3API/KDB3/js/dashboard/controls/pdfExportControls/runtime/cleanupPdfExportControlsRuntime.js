define([], function () {
  "use strict";

  function eachBucket(_bucket, _iteratee) {
    var key;
    for (key in _bucket) {
      if (Object.prototype.hasOwnProperty.call(_bucket, key)) _iteratee(_bucket[key], key);
    }
  }

  function cleanupPdfExportControlsRuntime(_KDB) {
    var runtime = _KDB.runtime.pdfExportControls;
    eachBucket(runtime.abortControllers, function (controller, key) {
      if (controller && typeof controller.abort === "function") controller.abort();
      runtime.abortControllers[key] = null;
    });
    eachBucket(runtime.listeners, function (cleanup, key) {
      if (typeof cleanup === "function") cleanup();
      runtime.listeners[key] = null;
    });
    eachBucket(runtime.observers, function (observer, key) {
      if (observer && typeof observer.disconnect === "function") observer.disconnect();
      runtime.observers[key] = null;
    });
    eachBucket(runtime.timers, function (timerId, key) {
      if (timerId) clearTimeout(timerId);
      runtime.timers[key] = null;
    });
    if (runtime.domRefs.rootEl && runtime.domRefs.rootEl.parentNode) {
      runtime.domRefs.rootEl.parentNode.removeChild(runtime.domRefs.rootEl);
    }
    _KDB.runtime.pdfExportControls = {
      domRefs: { toolbarHostEl: null, rootEl: null, buttonEl: null, iconEl: null, labelEl: null },
      subscriptions: {}, listeners: {}, abortControllers: { mount: null, exportRun: null },
      observers: {}, timers: {}, pendingPromises: { mount: null, exportRun: null },
      viewModel: { disabled: false, busy: false, serviceAvailable: true, label: "PDF" }
    };
  }

  return cleanupPdfExportControlsRuntime;
});
