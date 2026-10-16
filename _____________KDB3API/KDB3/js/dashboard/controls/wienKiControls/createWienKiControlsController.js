define([
  "./view/placeWienKiControls.js",
  "./view/syncWienKiControlsView.js",
  "./effects/bindWienKiClick.js",
  "./observation/bindToolbarObserver.js",
  "./effects/waitForWienKiToolbar.js",
  "./runtime/cleanupWienKiControlsRuntime.js"
], function (
  _placeWienKiControls,
  _syncWienKiControlsView,
  _bindWienKiClick,
  _bindToolbarObserver,
  _waitForWienKiToolbar,
  _cleanupRuntime
) {
  "use strict";

  // Named lifecycle { mount, destroy }. No state subtree, no undo/redo, one caller (KDB.js).

  function readRuntime(_KDB) { return _KDB.runtime.wienKiControls; }

  function isControllerDisposed(_controller) { return _controller.isDisposed; }

  function readWienKiLabel(_KDB) {
    var de = _KDB.config && _KDB.config.labels && _KDB.config.labels.de;
    var labels = (de && de.wienKiControls) || {};
    return labels.buttonTitle || "";
  }

  function hasConfiguredWienKiUrl(_KDB) {
    var links = _KDB.config && _KDB.config.links;
    var raw = links && links.wienKiUrl;
    var trimmed = String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "");
    var parsed;
    if (!trimmed) return false;
    try {
      parsed = new URL(trimmed);
    } catch (err) {
      return false;
    }
    return parsed.protocol === "https:";
  }

  function hasMessageCopyable(_KDB) {
    var message = _KDB.services && _KDB.services.message;
    return !!(message && typeof message.showCopyable === "function");
  }

  function syncView(_KDB, _viewModel) {
    var runtime = readRuntime(_KDB);
    runtime.viewModel = Object.assign({}, runtime.viewModel, _viewModel || {});
    return _syncWienKiControlsView(_KDB, runtime.viewModel);
  }

  function placeBindAndSync(_KDB, _toolbarHostEl) {
    _placeWienKiControls(_KDB, _toolbarHostEl);
    _bindWienKiClick(_KDB);
    syncView(_KDB, readRuntime(_KDB).viewModel);
  }

  function remountAndSync(_KDB, _controller) {
    var selector = _KDB.elements.selectors.wienKiControls.toolbarHostSelector;
    var toolbarHostEl;
    try {
      if (_controller.isDisposed || typeof document === "undefined" || !document.querySelector) return;
      toolbarHostEl = document.querySelector(selector);
      if (!toolbarHostEl) return;
      placeBindAndSync(_KDB, toolbarHostEl);
    } catch (err) {
      console.error("[wienKiControls.remountAndSync]", err);
    }
  }

  function finishMount(_KDB, _controller, _toolbarHostEl) {
    var runtime = readRuntime(_KDB);
    var label = readWienKiLabel(_KDB);
    var hasUrl = hasConfiguredWienKiUrl(_KDB);
    var hasMessage = hasMessageCopyable(_KDB);
    try {
      if (!hasUrl && !_controller.didWarnMissingUrl) {
        _controller.didWarnMissingUrl = true;
        console.warn("[wienKiControls.mount] _KDB.config.links.wienKiUrl is missing or not https; controls disabled.");
      }
      if (hasUrl && !hasMessage && !_controller.didWarnMissingMessage) {
        _controller.didWarnMissingMessage = true;
        console.warn("[wienKiControls.mount] _KDB.services.message.showCopyable is missing; controls disabled.");
      }
      if (hasUrl && hasMessage) runtime.viewModel = { disabled: false, serviceAvailable: true, label: label };
      else runtime.viewModel = { disabled: true, serviceAvailable: false, label: label };
      placeBindAndSync(_KDB, _toolbarHostEl);
      _bindToolbarObserver(_KDB, { remount: remountAndSync.bind(null, _KDB, _controller) });
    } catch (err) {
      console.error("[wienKiControls.finishMount]", err);
    }
  }

  function mount(_KDB, _controller) {
    try {
      if (_controller.isDisposed) {
        console.warn("[wienKiControls.mount] called after destroy");
        return false;
      }
      return _waitForWienKiToolbar(_KDB, {
        isDisposed: isControllerDisposed.bind(null, _controller),
        onReady: finishMount.bind(null, _KDB, _controller)
      });
    } catch (err) {
      console.error("[wienKiControls.mount]", err);
      return false;
    }
  }

  function destroy(_KDB, _controller) {
    try {
      if (_controller.isDisposed) return;
      _controller.isDisposed = true;
      _cleanupRuntime(_KDB);
    } catch (err) {
      console.error("[wienKiControls.destroy]", err);
    }
  }

  function createWienKiControlsController(_KDB) {
    var controller = { isDisposed: false, didWarnMissingUrl: false, didWarnMissingMessage: false };
    return { mount: mount.bind(null, _KDB, controller), destroy: destroy.bind(null, _KDB, controller) };
  }

  return createWienKiControlsController;
});
