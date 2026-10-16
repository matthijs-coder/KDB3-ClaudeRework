define([
  "./view/placeShareControls.js",
  "./view/syncShareControlsView.js",
  "./effects/bindShareClick.js",
  "./observation/bindToolbarObserver.js",
  "./effects/waitForShareToolbar.js",
  "./runtime/cleanupShareControlsRuntime.js"
], function (
  _placeShareControls,
  _syncShareControlsView,
  _bindShareClick,
  _bindToolbarObserver,
  _waitForShareToolbar,
  _cleanupRuntime
) {
  "use strict";

  // Named lifecycle { mount, destroy }; orch also assigns applyReadOnlyChrome.
  // No state subtree, no undo/redo, one external caller (KDB.js).

  function readRuntime(_KDB) { return _KDB.runtime.shareControls; }

  function isControllerDisposed(_controller) { return _controller.isDisposed; }

  function readShareLabel(_KDB) {
    var de = _KDB.config && _KDB.config.labels && _KDB.config.labels.de;
    var labels = (de && de.shareControls) || {};
    return labels.buttonTitle || "";
  }

  function hasShareMountDependencies(_KDB, _runtime) {
    var services = _KDB.services || {};
    var bridge = services.writebackBridge;
    var message = services.message;
    var facet = _runtime.dashboardFacet;
    return !!(
      bridge && typeof bridge.readSelectedParameterSet === "function" &&
      message && typeof message.showCopyable === "function" &&
      typeof message.showAlert === "function" &&
      facet && typeof facet.getBoardId === "function" &&
      typeof facet.getDashboardBiBaseUrl === "function"
    );
  }

  function syncView(_KDB, _viewModel) {
    var runtime = readRuntime(_KDB);
    runtime.viewModel = Object.assign({}, runtime.viewModel, _viewModel || {});
    return _syncShareControlsView(_KDB, runtime.viewModel);
  }

  function placeBindAndSync(_KDB, _toolbarHostEl) {
    _placeShareControls(_KDB, _toolbarHostEl);
    _bindShareClick(_KDB);
    syncView(_KDB, readRuntime(_KDB).viewModel);
  }

  function remountAndSync(_KDB, _controller) {
    var selector = _KDB.elements.selectors.shareControls.toolbarHostSelector;
    var toolbarHostEl;
    if (_controller.isDisposed || typeof document === "undefined" || !document.querySelector) return;
    toolbarHostEl = document.querySelector(selector);
    if (!toolbarHostEl) return;
    placeBindAndSync(_KDB, toolbarHostEl);
  }

  function finishMount(_KDB, _controller, _toolbarHostEl) {
    var runtime = readRuntime(_KDB);
    var label = readShareLabel(_KDB);
    var hasService = hasShareMountDependencies(_KDB, runtime);
    if (!hasService && !_controller.didWarnMissingService) {
      _controller.didWarnMissingService = true;
      console.warn("[shareControls.mount] required share services or stamped dashboardFacet methods are missing; controls disabled.");
    }
    if (!hasService) runtime.viewModel = { disabled: true, busy: false, serviceAvailable: false, label: label };
    else runtime.viewModel = { disabled: false, busy: false, serviceAvailable: true, label: label };
    placeBindAndSync(_KDB, _toolbarHostEl);
    _bindToolbarObserver(_KDB, { remount: remountAndSync.bind(null, _KDB, _controller) });
  }

  function mount(_KDB, _controller) {
    try {
      if (_controller.isDisposed) {
        console.warn("[shareControls.mount] called after destroy");
        return false;
      }
      return _waitForShareToolbar(_KDB, {
        isDisposed: isControllerDisposed.bind(null, _controller),
        onReady: finishMount.bind(null, _KDB, _controller)
      });
    } catch (err) {
      console.error("[shareControls.mount]", err);
      return false;
    }
  }

  function destroy(_KDB, _controller) {
    try {
      if (_controller.isDisposed) return;
      _controller.isDisposed = true;
      _cleanupRuntime(_KDB);
    } catch (err) {
      console.error("[shareControls.destroy]", err);
    }
  }

  function createShareControlsController(_KDB) {
    var controller = { isDisposed: false, didWarnMissingService: false };
    return { mount: mount.bind(null, _KDB, controller), destroy: destroy.bind(null, _KDB, controller) };
  }

  return createShareControlsController;
});
