define([
  "./runtime/ensureLoadingRuntime.js",
  "./runtime/clearLoadingRuntime.js",
  "./state/markAllLoadingDisposed.js",
  "./effects/reconcilePendingOverlayRemoval.js",
  "./effects/applyLoadingOverlay.js",
  "./effects/removeLoadingOverlay.js",
  "./effects/updateLoadingMessage.js",
], function (_ensureLoadingRuntime, _clearLoadingRuntime, _markAllLoadingDisposed, _reconcilePendingOverlayRemoval, _applyLoadingOverlay, _removeLoadingOverlay, _updateLoadingMessage) {
  "use strict";

  function createLoadingService(_KDB) {
    let _isDisposed = false;
    let didWarnStartDisposed = false;
    let didWarnFinishDisposed = false;
    let didWarnUpdateDisposed = false;

    _ensureLoadingRuntime(_KDB);

    function startLoading(_options) {
      if (_isDisposed) {
        didWarnStartDisposed = warnDisposed("startLoading", didWarnStartDisposed);
        return null;
      }
      try {
        _reconcilePendingOverlayRemoval(_KDB, _options);
        return _applyLoadingOverlay(_KDB, _options);
      } catch (error) {
        logPublicMethodError("startLoading", error);
        return null;
      }
    }

    function finishLoading(_options) {
      if (_isDisposed) {
        didWarnFinishDisposed = warnDisposed("finishLoading", didWarnFinishDisposed);
        return;
      }
      try {
        _removeLoadingOverlay(_KDB, _options);
      } catch (error) {
        logPublicMethodError("finishLoading", error);
      }
    }

    function updateLoadingMessage(_options) {
      if (_isDisposed) {
        didWarnUpdateDisposed = warnDisposed("updateLoadingMessage", didWarnUpdateDisposed);
        return false;
      }
      try {
        return _updateLoadingMessage(_KDB, _options);
      } catch (error) {
        logPublicMethodError("updateLoadingMessage", error);
        return false;
      }
    }

    function destroy() {
      if (_isDisposed) {
        return;
      }
      try {
        _isDisposed = true;
        _clearLoadingRuntime(_KDB);
        _markAllLoadingDisposed(_KDB);
      } catch (error) {
        logPublicMethodError("destroy", error);
      }
    }

    return {
      startLoading: startLoading,
      finishLoading: finishLoading,
      updateLoadingMessage: updateLoadingMessage,
      destroy: destroy
    };
  }

  function warnDisposed(methodName, didWarnDisposed) {
    if (!didWarnDisposed) {
      console.warn("[loadingService." + methodName + "] called after destroy");
    }
    return true;
  }

  function logPublicMethodError(methodName, error) {
    console.error("[loadingService." + methodName + "] public method failed", error);
  }

  return createLoadingService;
});
