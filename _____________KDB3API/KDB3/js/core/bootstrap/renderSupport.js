define(["./config.js", "./labels.js"], function (_config, _labels) {
  "use strict";

  function scheduleChromeCapabilityFlush(_KDB) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.scheduleFlush !== "function") return;
    try {
      checks.scheduleFlush(_KDB);
    } catch (error) {
      console.error("[core.chromeCapability] scheduleFlush failed", error);
    }
  }

  // Boot boundary: on a boot failure the overlay is lifted through the same finishLoading chain as the
  // success path and the user sees an alert. Never on a disposed instance: destroy cleans the overlay up
  // itself and the message service is gone by then.
  function reportRenderFailure(_KDB, _rootLoadingHandle, _error) {
    if (_KDB._isDisposed) { return; }
    const loadingService = _KDB.services && _KDB.services.loading;
    if (_rootLoadingHandle && loadingService && typeof loadingService.finishLoading === "function") {
      try {
        loadingService.finishLoading({ handle: _rootLoadingHandle });
      } catch (loadingError) {
        console.error("[core.renderKDB] loading cleanup failed", loadingError);
      }
    }
    const messageService = _KDB.services && _KDB.services.message;
    if (messageService && typeof messageService.showAlert === "function") {
      const labels = _labels.readBootstrapLabels(_KDB);
      try {
        messageService.showAlert({
          title: labels.renderFailedTitle,
          severity: "error",
          message: labels.renderFailedBody + String((_error && _error.message) || _error)
        });
      } catch (messageError) {
        console.warn("[core.renderKDB] failure message failed", messageError);
      }
    }
  }

  async function awaitCubesUnavailableHomeDialog(_KDB) {
    try {
      const present = _KDB.runtime && _KDB.runtime.homeDialog && typeof _KDB.runtime.homeDialog.presentCubesUnavailable === "function"
        ? _KDB.runtime.homeDialog.presentCubesUnavailable
        : null;
      if (!present) { return; }
      await present(_KDB);
    } catch (error) {
      console.error("[core.awaitCubesUnavailableHomeDialog]", error);
    }
  }

  function startBootLoading(_KDB) {
    const loadingService = _KDB.services && _KDB.services.loading;
    if (_KDB.properties.KDBPlayLoadingImageToggle === true && loadingService) {
      return loadingService.startLoading({
        mountEl: document.querySelector(_KDB.elements.selectors.root.pageViewContent),
        mountKey: _config.BOOT_LOADING_MOUNT_KEY,
        transparent: _KDB.properties.KDBLoadingImageTransparentToggle === true,
        messageKey: "dashboard"
      });
    }
    return null;
  }

  return {
    awaitCubesUnavailableHomeDialog: awaitCubesUnavailableHomeDialog,
    reportRenderFailure: reportRenderFailure,
    scheduleChromeCapabilityFlush: scheduleChromeCapabilityFlush,
    startBootLoading: startBootLoading
  };
});
