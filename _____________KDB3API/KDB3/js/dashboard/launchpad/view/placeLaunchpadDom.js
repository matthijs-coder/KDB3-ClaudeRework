define([
  "./resolveLaunchpadOwnerDocument.js",
  "./readLaunchpadDomSelectors.js",
  "./shouldKeepExistingHideSpot.js",
  "./syncLaunchpadRuntimeDomRefs.js"
], function (
  _resolveLaunchpadOwnerDocument,
  _readLaunchpadDomSelectors,
  _shouldKeepExistingHideSpot,
  _syncLaunchpadRuntimeDomRefs
) {
  function __controller(_KDB, _buildResult) {
    try {
      const buildResult = _buildResult || {};
      const ownerDocument = _resolveLaunchpadOwnerDocument(_KDB, buildResult);
      const runtime = ensureRuntime(_KDB);
      const selectors = _readLaunchpadDomSelectors(_KDB);
      const existingHideSpotEl = ownerDocument.querySelector(selectors.hideSpotSelector);

      if (isConnectedElement(existingHideSpotEl)) {
        if (_shouldKeepExistingHideSpot(_KDB, existingHideSpotEl)) {
          _syncLaunchpadRuntimeDomRefs(runtime, existingHideSpotEl, selectors);
          return existingHideSpotEl.parentNode === ownerDocument.body;
        }
        existingHideSpotEl.parentNode.removeChild(existingHideSpotEl);
      }

      validateBuildResult(buildResult);
      ownerDocument.body.appendChild(buildResult.hideSpotEl);
      runtime.domRefs = buildResult.domRefs || {};

      return buildResult.hideSpotEl.parentNode === ownerDocument.body;
    } catch (err) {
      console.error("[launchpad.placeLaunchpadDom] failed", err);
      throw err;
    }
  }

  function ensureRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.launchpad = _KDB.runtime.launchpad || {};
      _KDB.runtime.launchpad.domRefs = _KDB.runtime.launchpad.domRefs || {};

      return _KDB.runtime.launchpad;
    } catch (err) {
      console.error("[launchpad.ensureRuntime] failed", err);
      throw err;
    }
  }

  function isConnectedElement(element) {
    return !!element && (element.isConnected === true || !!element.parentNode);
  }

  function validateBuildResult(buildResult) {
    try {
      if (!buildResult.hideSpotEl) {
        throw new Error("Launchpad hide spot was not built.");
      }
    } catch (err) {
      console.error("[launchpad.validateBuildResult] failed", err);
      throw err;
    }
  }

  return __controller;
});
