define([], function () {
  function __controller(_runtime, _hideSpotEl, _selectors) {
    try {
      const rootEl = _hideSpotEl.querySelector(_selectors.rootSelector);
      _runtime.domRefs = _runtime.domRefs || {};
      _runtime.domRefs.hideSpotEl = _hideSpotEl;
      _runtime.domRefs.rootEl = rootEl || _hideSpotEl;
    } catch (err) {
      console.error("[launchpad.syncLaunchpadRuntimeDomRefs] failed", err);
      throw err;
    }
  }

  return __controller;
});
