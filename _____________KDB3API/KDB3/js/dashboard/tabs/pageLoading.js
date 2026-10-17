define(["../../core/utils/kit/async.js"], function (_async) {
  "use strict";

  const MOUNT_KEY = "kdb-tab-page-loading";
  const FOOTER_ID = "KDB_bottomFooterWrapper";
  const PAGE_SELECTOR = ".page.pagegenericPage";
  const INNER_CAP_MS = 2000;
  const INNER_POLL_MS = 100;
  const POLL_KEY = "tabPageLoadingReady";

  // Loading cover on the active tab page. With finishWhenReady the cover ends by itself once the inner page
  // exists, or after INNER_CAP_MS.
  // start and finish are cosmetic and never throw: a failing cover must not fail the operation it decorates.
  function start(_KDB, _options) {
    try {
      finish(_KDB);
      const options = _options || {};
      const loading = _KDB.services && _KDB.services.loading;
      if (!loading || typeof loading.startLoading !== "function") { return null; }
      if (options.finishWhenReady === true && hasInnerPage(_KDB, options)) { return null; }
      const wrapper = resolvePageWrapper(_KDB, options);
      const mountEl = findInnerPage(wrapper, _KDB) || wrapper;
      if (!mountEl) { return null; }
      const handle = loading.startLoading({ mountEl: mountEl, mountKey: MOUNT_KEY, messageKey: "tab" });
      if (options.finishWhenReady === true) { armInnerPageFinish(_KDB, options); }
      return handle;
    } catch (err) {
      console.warn("[tabs.pageLoading.start] loading cover failed", err);
      return null;
    }
  }

  function finish(_KDB) {
    try {
      abortInnerPagePoll(_KDB);
      const loading = _KDB.services && _KDB.services.loading;
      if (loading && typeof loading.finishLoading === "function") { loading.finishLoading({ mountKey: MOUNT_KEY }); }
    } catch (err) {
      console.warn("[tabs.pageLoading.finish] loading cover failed", err);
    }
  }

  // A throwing page check counts as "not ready yet"; an aborted poll (finish or a newer start) does nothing.
  function armInnerPageFinish(_KDB, options) {
    const controllers = ensureAbortControllers(_KDB);
    const controller = new AbortController();
    controllers[POLL_KEY] = controller;
    _async.pollUntil({
      check: function () { return hasInnerPage(_KDB, options); },
      timeoutMs: INNER_CAP_MS,
      intervalMs: INNER_POLL_MS,
      signal: controller.signal
    }).then(function (outcome) {
      if (outcome.reason === "aborted") { return; }
      if (controllers[POLL_KEY] === controller) { delete controllers[POLL_KEY]; }
      finish(_KDB);
    });
  }

  function abortInnerPagePoll(_KDB) {
    const controllers = _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.abortControllers;
    if (!controllers || !controllers[POLL_KEY]) { return; }
    controllers[POLL_KEY].abort();
    delete controllers[POLL_KEY];
  }

  function ensureAbortControllers(_KDB) {
    _KDB.runtime.tabs = _KDB.runtime.tabs || {};
    _KDB.runtime.tabs.abortControllers = _KDB.runtime.tabs.abortControllers || {};
    return _KDB.runtime.tabs.abortControllers;
  }

  function resolvePageWrapper(_KDB, options) {
    const tabs = _KDB.state && _KDB.state.tabs;
    const tab = tabs && tabs.byIndex && tabs.byIndex[String(tabs.activeIndex)];
    return readElById(options.pageId) || readElById(options.tabId) || readElById(tab && (tab.pageId || tab.tabId));
  }

  function hasInnerPage(_KDB, options) {
    return !!findInnerPage(resolvePageWrapper(_KDB, options), _KDB);
  }

  function findInnerPage(wrapper, _KDB) {
    if (!wrapper) { return null; }
    const selector = readPageRootSelector(_KDB);
    if (wrapper.matches && wrapper.matches(selector) && !isFooterEl(wrapper)) { return wrapper; }
    const inner = typeof wrapper.querySelector === "function" ? wrapper.querySelector(selector) : null;
    return inner && !isFooterEl(inner) ? inner : null;
  }

  function readPageRootSelector(_KDB) {
    const s = _KDB.elements && _KDB.elements.selectors;
    return (s && s.dragDrop && s.dragDrop.canvasDropboxSelector) || (s && s.page && s.page.exactPageRootSelector) || PAGE_SELECTOR;
  }

  function readElById(id) {
    if (typeof id !== "string" || !id || typeof document === "undefined" || !document.getElementById) { return null; }
    const el = document.getElementById(id);
    return el && !isFooterEl(el) ? el : null;
  }

  function isFooterEl(el) {
    return !el || el.id === FOOTER_ID || (typeof el.closest === "function" && !!el.closest("#" + FOOTER_ID));
  }

  return { start: start, finish: finish };
});
