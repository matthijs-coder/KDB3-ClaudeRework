define(["./config.js"], function (_config) {
  "use strict";

  function readMountSelector(_KDB) {
    var root = _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root;
    return root && root.footerMountRoot;
  }

  function resolveMountTarget(_KDB, _options) {
    var selector = readMountSelector(_KDB);
    var el = selector ? document.querySelector(selector) : null;
    if (!el && _options && _options.mountTarget && _options.mountTarget.nodeType) {
      el = _options.mountTarget;
    }
    return el || null;
  }

  function ensureFooterMountTarget(_KDB, _options) {
    var domRefs = _KDB.runtime.footer.domRefs;
    if (domRefs.mountTargetEl && domRefs.mountTargetEl.nodeType) return domRefs.mountTargetEl;
    domRefs.mountTargetEl = resolveMountTarget(_KDB, _options);
    return domRefs.mountTargetEl;
  }

  function trackChromeWait(_KDB, _key, _promise) {
    var checks = _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.trackWait !== "function") return _promise;
    return checks.trackWait(_KDB, _key, _promise);
  }

  function abortFooterMountTargetWait(_KDB) {
    var controllers = _KDB.runtime.footer.abortControllers;
    if (controllers.mountTargetEl) controllers.mountTargetEl.abort();
    delete controllers.mountTargetEl;
  }

  function releaseMountTargetWait(_KDB, _controller) {
    var controllers = _KDB.runtime.footer.abortControllers;
    if (controllers.mountTargetEl === _controller) delete controllers.mountTargetEl;
  }

  async function awaitFooterMountTarget(_KDB, _waitForElObserver, _selector, _controller, _isDisposed, _onReady) {
    try {
      var el = await trackChromeWait(
        _KDB,
        "root.footerMountRoot",
        _waitForElObserver(_selector, document, { timeoutMs: _config.MOUNT_TARGET_TIMEOUT_MS, signal: _controller.signal })
      );
      if (_isDisposed() || !el) return;
      releaseMountTargetWait(_KDB, _controller);
      _KDB.runtime.footer.domRefs.mountTargetEl = el;
      _onReady();
    } catch (err) {
      releaseMountTargetWait(_KDB, _controller);
      if (err && err.code === "ABORTED") return;
      console.error("[footer.mountTargetObserver]", err);
    }
  }

  function waitForFooterMountTarget(_KDB, _isDisposed, _onReady) {
    var controllers = _KDB.runtime.footer.abortControllers;
    var selector = readMountSelector(_KDB);
    if (!selector) return;
    var waitForElObserver = _KDB.utils && _KDB.utils.waitForElObserver;
    if (typeof waitForElObserver !== "function") {
      console.warn("[footer.mountTargetObserver] _KDB.utils.waitForElObserver is missing");
      return;
    }
    if (controllers.mountTargetEl) return;
    var controller = new AbortController();
    controllers.mountTargetEl = controller;
    awaitFooterMountTarget(_KDB, waitForElObserver, selector, controller, _isDisposed, _onReady);
  }

  return {
    ensureFooterMountTarget: ensureFooterMountTarget,
    abortFooterMountTargetWait: abortFooterMountTargetWait,
    waitForFooterMountTarget: waitForFooterMountTarget
  };
});
