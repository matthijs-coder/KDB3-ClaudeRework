define([], function () {
  "use strict";

  const MOUNT_KEY = "kdb-tab-page-loading";
  const FOOTER_ID = "KDB_bottomFooterWrapper";
  const PAGE_SELECTOR = ".page.pagegenericPage";
  const INNER_CAP_MS = 2000;
  const INNER_POLL_MS = 100;
  const POLL_KEY = "tabPageLoadingReady";

  function start(_KDB, _options) {
    try {
      finish(_KDB);
      const loading = _KDB && _KDB.services && _KDB.services.loading;
      if (!loading || typeof loading.startLoading !== "function") { return null; }
      if (_options && _options.finishWhenReady === true && hasInnerPage(_KDB, _options)) { return null; }
      const mountEl = resolveTabPageMountEl(_KDB, _options);
      if (!mountEl) { return null; }
      const handle = loading.startLoading({ mountEl: mountEl, mountKey: MOUNT_KEY, messageKey: "tab" });
      if (_options && _options.finishWhenReady === true) { armInnerPageFinish(_KDB, _options); }
      return handle;
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.start] failed", err);
      return null;
    }
  }

  function finish(_KDB) {
    try {
      clearInnerPagePoll(_KDB);
      const loading = _KDB && _KDB.services && _KDB.services.loading;
      if (loading && typeof loading.finishLoading === "function") { loading.finishLoading({ mountKey: MOUNT_KEY }); }
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.finish] failed", err);
    }
  }

  function armInnerPageFinish(_KDB, _options) {
    try {
      clearInnerPagePoll(_KDB);
      if (hasInnerPage(_KDB, _options)) { finish(_KDB); return; }
      const runtime = ensureTabsTimers(_KDB);
      if (!runtime) { finish(_KDB); return; }
      runtime.timers[POLL_KEY] = setTimeout(onInnerPagePollTick.bind(null, _KDB, _options, Date.now()), INNER_POLL_MS);
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.arm] failed", err);
      finish(_KDB);
    }
  }

  function onInnerPagePollTick(_KDB, _options, _startedAt) {
    try {
      const runtime = _KDB && _KDB.runtime && _KDB.runtime.tabs;
      if (runtime && runtime.timers) { delete runtime.timers[POLL_KEY]; }
      if (hasInnerPage(_KDB, _options) || Date.now() - _startedAt >= INNER_CAP_MS) { finish(_KDB); return; }
      if (!runtime || !runtime.timers) { finish(_KDB); return; }
      runtime.timers[POLL_KEY] = setTimeout(onInnerPagePollTick.bind(null, _KDB, _options, _startedAt), INNER_POLL_MS);
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.poll] failed", err);
      finish(_KDB);
    }
  }

  function resolveTabPageMountEl(_KDB, _options) {
    try {
      const wrapper = resolvePageWrapper(_KDB, _options);
      return findInnerPage(wrapper, _KDB) || wrapper;
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.resolve] failed", err);
      return null;
    }
  }

  function resolvePageWrapper(_KDB, _options) {
    try {
      const tabs = _KDB && _KDB.state && _KDB.state.tabs;
      const tab = tabs && tabs.byIndex && tabs.byIndex[String(tabs.activeIndex)];
      return readElById(_options && _options.pageId) || readElById(_options && _options.tabId) || readElById(tab && (tab.pageId || tab.tabId));
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.wrapper] failed", err);
      return null;
    }
  }
  function hasInnerPage(_KDB, _options) {
    try {
      return !!findInnerPage(resolvePageWrapper(_KDB, _options), _KDB);
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.hasInner] failed", err);
      return false;
    }
  }
  function findInnerPage(_wrapper, _KDB) {
    try {
      if (!_wrapper) { return null; }
      const selector = readPageRootSelector(_KDB);
      if (_wrapper.matches && _wrapper.matches(selector) && !isFooterEl(_wrapper)) { return _wrapper; }
      const inner = typeof _wrapper.querySelector === "function" ? _wrapper.querySelector(selector) : null;
      return inner && !isFooterEl(inner) ? inner : null;
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.findInner] failed", err);
      return null;
    }
  }

  function readPageRootSelector(_KDB) {
    const s = _KDB && _KDB.elements && _KDB.elements.selectors;
    return (s && s.dragDrop && s.dragDrop.canvasDropboxSelector) || (s && s.page && s.page.exactPageRootSelector) || PAGE_SELECTOR;
  }

  function ensureTabsTimers(_KDB) {
    try {
      if (!_KDB) { return null; }
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.tabs = _KDB.runtime.tabs || {};
      _KDB.runtime.tabs.timers = _KDB.runtime.tabs.timers || {};
      return _KDB.runtime.tabs;
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.runtime] failed", err);
      return null;
    }
  }

  function clearInnerPagePoll(_KDB) {
    try {
      const timers = _KDB && _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.timers;
      if (!timers || timers[POLL_KEY] == null) { return; }
      clearTimeout(timers[POLL_KEY]);
      delete timers[POLL_KEY];
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.clearPoll] failed", err);
    }
  }

  function readElById(_id) {
    try {
      if (typeof _id !== "string" || !_id || typeof document === "undefined" || !document.getElementById) { return null; }
      const el = document.getElementById(_id);
      return el && !isFooterEl(el) ? el : null;
    } catch (err) {
      console.error("[tabs.applyTabPageLoading.readEl] failed", err);
      return null;
    }
  }

  function isFooterEl(_el) {
    return !_el || _el.id === FOOTER_ID || (typeof _el.closest === "function" && !!_el.closest("#" + FOOTER_ID));
  }

  return { start: start, finish: finish };
});
