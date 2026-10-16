define([
  "../../utils/kit/errors.js",
  "../../utils/kit/runtime.js",
  "./caption.js",
  "./config.js",
  "./overlay.js",
  "./state.js"
], function (_errors, _rt, _caption, _config, _overlay, _state) {
  "use strict";

  function logPublicError(methodName, error) {
    console.error("[loadingService." + methodName + "] public method failed", error);
  }

  function clearLoadingRuntime(_KDB) {
    var runtime = _state.ensureLoadingRuntime(_KDB);
    var errors;
    _overlay.clearOverlays(runtime);
    errors = _rt.disposeRuntimeBuckets(runtime);
    if (errors.length) {
      console.error("[loadingService.destroy] cleanup errors", errors);
    }
    _state.ensureLoadingRuntime(_KDB);
  }

  function createLoadingService(_KDB) {
    var guard = _errors.createDisposedGuard("loadingService");

    function startLoading(options) {
      if (guard.blocked("startLoading")) return null;
      try {
        _overlay.reconcilePendingRemoval(_KDB, options);
        return _overlay.startOverlay(_KDB, options);
      } catch (error) {
        logPublicError("startLoading", error);
        return null;
      }
    }

    function finishLoading(options) {
      if (guard.blocked("finishLoading")) return;
      try {
        _overlay.finishOverlay(_KDB, options);
      } catch (error) {
        logPublicError("finishLoading", error);
      }
    }

    function updateLoadingMessage(options) {
      if (guard.blocked("updateLoadingMessage")) return false;
      try {
        return _caption.updateLoadingMessage(_KDB, options);
      } catch (error) {
        logPublicError("updateLoadingMessage", error);
        return false;
      }
    }

    function destroy() {
      if (guard.isDisposed()) return;
      guard.dispose();
      try {
        clearLoadingRuntime(_KDB);
        _state.markAllLoadingDisposed(_KDB);
      } catch (error) {
        logPublicError("destroy", error);
      }
    }

    _state.ensureLoadingRuntime(_KDB);
    return {
      startLoading: startLoading,
      finishLoading: finishLoading,
      updateLoadingMessage: updateLoadingMessage,
      destroy: destroy
    };
  }

  function mergeLoadingLabels(_KDB) {
    var existing;
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    existing = _KDB.config.labels.de.loading;
    _KDB.config.labels.de.loading = Object.assign({}, _config.loadingLabels, existing && typeof existing === "object" ? existing : {});
  }

  function registerLoadingService(_KDB) {
    _KDB.services = _KDB.services || {};
    mergeLoadingLabels(_KDB);
    _KDB.services.loading = createLoadingService(_KDB);
    return _KDB.services.loading;
  }

  return registerLoadingService;
});
