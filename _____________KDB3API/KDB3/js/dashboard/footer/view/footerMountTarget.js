define([], function () {
  "use strict";

  function readFooterMountSelector(_KDB) {
    return _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root && _KDB.elements.selectors.root.footerMountRoot;
  }
  function resolveFooterMountTarget(_KDB, _options) {
    var selector = readFooterMountSelector(_KDB);
    var el = null;
    if (selector && typeof document !== "undefined" && document.querySelector) {
      el = document.querySelector(selector);
    }
    if (!el && _options && _options.mountTarget && _options.mountTarget.nodeType) {
      el = _options.mountTarget;
    }
    return el || null;
  }
  function ensureFooterMountTarget(_KDB, _options) {
    var dr = _KDB.runtime && _KDB.runtime.footer && _KDB.runtime.footer.domRefs;
    if (!dr) return null;
    if (dr.mountTargetEl && dr.mountTargetEl.nodeType) return dr.mountTargetEl;
    dr.mountTargetEl = resolveFooterMountTarget(_KDB, _options);
    return dr.mountTargetEl;
  }
  function trackChromeWait(_KDB, key, promise) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.trackWait !== "function") return promise;
    return checks.trackWait(_KDB, key, promise);
  }
  function abortFooterMountTargetWait(rt) {
    var ac = rt && rt.abortControllers && rt.abortControllers.mountTargetEl;
    if (ac && typeof ac.abort === "function") ac.abort();
    if (rt && rt.abortControllers) delete rt.abortControllers.mountTargetEl;
  }
  function waitForFooterMountTarget(_KDB, isDisposed, onReady) {
    var rt = _KDB.runtime.footer;
    var selector = readFooterMountSelector(_KDB);
    var waitForElObserver = _KDB.utils && _KDB.utils.waitForElObserver;
    if (!selector || typeof document === "undefined") return;
    if (typeof waitForElObserver !== "function") {
      console.warn("[footer.mountTargetObserver] _KDB.utils.waitForElObserver is missing");
      return;
    }
    if (rt.abortControllers && rt.abortControllers.mountTargetEl) return;
    rt.abortControllers = rt.abortControllers || {};
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (!ctrl) return;
    rt.abortControllers.mountTargetEl = ctrl;
    trackChromeWait(_KDB, "root.footerMountRoot", waitForElObserver(selector, document, { timeoutMs: 30000, signal: ctrl.signal }))
      .then(function (el) {
        if ((isDisposed && isDisposed()) || !el) return;
        if (rt.abortControllers && rt.abortControllers.mountTargetEl === ctrl) delete rt.abortControllers.mountTargetEl;
        _KDB.runtime.footer.domRefs.mountTargetEl = el;
        if (typeof onReady === "function") onReady();
      })
      .catch(function (err) {
        if (rt.abortControllers && rt.abortControllers.mountTargetEl === ctrl) delete rt.abortControllers.mountTargetEl;
        if (err && err.code === "ABORTED") return;
        console.error("[footer.mountTargetObserver]", err);
      });
  }

  return {
    ensureFooterMountTarget: ensureFooterMountTarget,
    abortFooterMountTargetWait: abortFooterMountTargetWait,
    waitForFooterMountTarget: waitForFooterMountTarget,
  };
});
