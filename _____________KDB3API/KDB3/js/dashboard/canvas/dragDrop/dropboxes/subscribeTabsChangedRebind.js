define(["../../../tabs/events/eventNames.js"], function (_tabsEventNames) {
  "use strict";

  const POLL_INTERVAL_MS = 200;
  const BIND_TIMEOUT_MS = 3000;

  // Lazily loaded tabs render their page/dropbox element only on activation,
  // after dragDrop mount already bound dropboxes; without a rebind those pages
  // never get kdb_dropbox="true" / drop listeners and refuse native drops.
  function register(_KDB, _refreshDropboxes) {
    const runtime = _KDB.runtime && _KDB.runtime.dragDrop;
    const events = _KDB ? _KDB.events : null;
    if (!runtime || !events || typeof events.subscribe !== "function") {
      return false;
    }
    unregister(_KDB);
    runtime.subscriptions.tabsChanged = events.subscribe(
      _tabsEventNames.CHANGED,
      onTabsChanged.bind(null, _KDB, _refreshDropboxes)
    );
    return true;
  }

  // Every activation rebinds (bugfix sync 2026-07-13): bindDropboxes is a
  // document-wide idempotent cleanup-and-rebind, and the original
  // firstActivation-only handling with a single 400ms retry regularly lost
  // the race against Cognos' lazy page render — leaving the new tab's
  // dropbox unbound forever (firstActivation never fires again).
  function onTabsChanged(_KDB, _refreshDropboxes, _payload) {
    if (isTabsSuppressed(_KDB)) {
      return;
    }
    const payload = _payload || {};
    runRefresh(_refreshDropboxes);
    pollUntilTabBound(_KDB, _refreshDropboxes, payload.pageId || payload.tabId || null);
  }

  // Bounded repair poll: while the activated tab's page element is missing or
  // still unbound, re-run the refresh until it sticks or the cap is reached.
  // A newer activation restarts the poll for its own tab (single timer slot).
  function pollUntilTabBound(_KDB, _refreshDropboxes, pageId) {
    const runtime = _KDB.runtime && _KDB.runtime.dragDrop;
    if (!runtime || !runtime.timers) {
      return;
    }
    if (runtime.timers.tabsChangedRebind) {
      clearTimeout(runtime.timers.tabsChangedRebind);
      delete runtime.timers.tabsChangedRebind;
    }
    const startedAt = Date.now();
    function poll() {
      delete runtime.timers.tabsChangedRebind;
      if (isTabDropboxBound(pageId)) {
        return;
      }
      runRefresh(_refreshDropboxes);
      if (isTabDropboxBound(pageId) || Date.now() - startedAt >= BIND_TIMEOUT_MS) {
        return;
      }
      runtime.timers.tabsChangedRebind = setTimeout(poll, POLL_INTERVAL_MS);
    }
    runtime.timers.tabsChangedRebind = setTimeout(poll, POLL_INTERVAL_MS);
  }

  // Without a verifiable page element id the initial refresh has to suffice;
  // a helper/non-dashboard page never gets bound and simply runs to the cap.
  function isTabDropboxBound(pageId) {
    if (!pageId || typeof document === "undefined" || !document.getElementById) {
      return true;
    }
    const pageEl = document.getElementById(pageId);
    return !!pageEl && pageEl.getAttribute("kdb_dropbox") === "true";
  }

  // Never throw into the event bus; a missed rebind stays recoverable via the
  // next activation refresh.
  function runRefresh(_refreshDropboxes) {
    try {
      _refreshDropboxes();
    } catch (err) {
      console.warn("[dragDrop.subscribeTabsChangedRebind] refreshDropboxes failed", err);
    }
  }

  function isTabsSuppressed(_KDB) {
    const pendingPromises = _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises;
    return !!(pendingPromises && (pendingPromises.traverse || pendingPromises.startup || pendingPromises.tabMutation));
  }

  function unregister(_KDB) {
    const runtime = _KDB.runtime && _KDB.runtime.dragDrop;
    if (!runtime || !runtime.subscriptions) {
      return;
    }
    if (runtime.timers && runtime.timers.tabsChangedRebind) {
      clearTimeout(runtime.timers.tabsChangedRebind);
      delete runtime.timers.tabsChangedRebind;
    }
    if (typeof runtime.subscriptions.tabsChanged === "function") {
      runtime.subscriptions.tabsChanged();
    }
    delete runtime.subscriptions.tabsChanged;
  }

  return { register: register, unregister: unregister };
});
