define([
  "./view/placePdfExportControls.js",
  "./view/syncPdfExportControlsView.js",
  "./effects/createPdfExportRunEffect.js",
  "./observation/bindToolbarObserver.js",
  "./effects/waitForPdfToolbar.js",
  "./runtime/cleanupPdfExportControlsRuntime.js"
], function (_placePdfExportControls, _syncPdfExportControlsView, _createPdfExportRunEffect, _bindToolbarObserver, _waitForPdfToolbar, _cleanupRuntime) {
  "use strict";

  function readRuntime(_KDB) { return _KDB.runtime.pdfExportControls; }
  function syncView(_KDB, _viewModel) {
    var runtime = readRuntime(_KDB);
    runtime.viewModel = Object.assign({}, runtime.viewModel, _viewModel || {});
    return _syncPdfExportControlsView(_KDB, runtime.viewModel);
  }

  function placeBindAndSync(_KDB, _controller, _toolbarHostEl) {
    var bindRunEffect = _createPdfExportRunEffect(_KDB, _controller, syncView.bind(null, _KDB));
    _placePdfExportControls(_KDB, _toolbarHostEl);
    bindRunEffect();
    syncView(_KDB, readRuntime(_KDB).viewModel);
  }

  function remountAndSync(_KDB, _controller) {
    var runtime = readRuntime(_KDB);
    var selector = _KDB.elements.selectors.pdfExportControls.toolbarHostSelector;
    var toolbarHostEl;
    if (_controller.isDisposed || typeof document === "undefined" || !document.querySelector) return;
    toolbarHostEl = document.querySelector(selector);
    if (!toolbarHostEl) return;
    if (runtime.domRefs.toolbarHostEl === toolbarHostEl && runtime.domRefs.rootEl && runtime.domRefs.rootEl.parentNode === toolbarHostEl) {
      syncView(_KDB, runtime.viewModel);
      return;
    }
    placeBindAndSync(_KDB, _controller, toolbarHostEl);
  }

  function finishMount(_KDB, _controller, _toolbarHostEl) {
    var service = _KDB.services && _KDB.services.dashboardPdf;
    var runtime = readRuntime(_KDB);
    var hasService = !!(service && typeof service.exportDashboardPdf === "function");
    if (!hasService && !_controller.didWarnMissingService) {
      _controller.didWarnMissingService = true;
      console.warn("[pdfExportControls.mount] _KDB.services.dashboardPdf is missing; controls disabled.");
    }
    if (!hasService) runtime.viewModel = { disabled: true, busy: false, serviceAvailable: false, label: "PDF" };
    else if (!runtime.pendingPromises.exportRun) runtime.viewModel = { disabled: false, busy: false, serviceAvailable: true, label: "PDF" };
    placeBindAndSync(_KDB, _controller, _toolbarHostEl);
    _bindToolbarObserver(_KDB, { remount: remountAndSync.bind(null, _KDB, _controller) });
  }

  function mount(_KDB, _controller) {
    if (_controller.isDisposed) { console.warn("[pdfExportControls.mount] called after destroy"); return false; }
    return _waitForPdfToolbar(_KDB, {
      isDisposed: function () { return _controller.isDisposed; },
      onReady: finishMount.bind(null, _KDB, _controller)
    });
  }

  function destroy(_KDB, _controller) {
    var runtime = readRuntime(_KDB);
    if (_controller.isDisposed) return;
    _controller.isDisposed = true;
    if (runtime.abortControllers.exportRun && typeof runtime.abortControllers.exportRun.abort === "function") {
      runtime.abortControllers.exportRun.abort();
      runtime.abortControllers.exportRun = null;
    }
    _cleanupRuntime(_KDB);
  }

  function createPdfExportControlsController(_KDB) {
    var controller = { isDisposed: false, didWarnMissingService: false };
    return { mount: mount.bind(null, _KDB, controller), destroy: destroy.bind(null, _KDB, controller) };
  }

  return createPdfExportControlsController;
});
