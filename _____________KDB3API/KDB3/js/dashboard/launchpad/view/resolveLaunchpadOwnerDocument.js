define([], function () {
  function __controller(_KDB, _buildResult) {
    try {
      if (_buildResult.hideSpotEl && _buildResult.hideSpotEl.ownerDocument) {
        return _buildResult.hideSpotEl.ownerDocument;
      }

      const hostSelector = readHostSelector(_KDB);
      const hostEl = hostSelector && typeof document !== "undefined" && typeof document.querySelector === "function" ? document.querySelector(hostSelector) : null;
      if (hostEl && hostEl.ownerDocument) {
        return hostEl.ownerDocument;
      }

      throw new Error("Launchpad owner document is unavailable.");
    } catch (err) {
      console.error("[launchpad.resolveLaunchpadOwnerDocument] failed", err);
      throw err;
    }
  }

  function readHostSelector(_KDB) {
    try {
      const rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
      if (!rootSelectors) {
        return null;
      }
      return rootSelectors.kdbWidget || null;
    } catch (err) {
      console.error("[launchpad.readHostSelector] failed", err);
      throw err;
    }
  }

  return __controller;
});
