define([
  "../../../../core/cognosHost/config/pageChromeSelectors.js",
  "../../../../core/utils/kit/data.js"
], function (_pageChrome, _data) {
  "use strict";

  // Selector overrides live in _KDB.elements.selectors.dragDrop; the chrome catalog is the fallback.
  function readDragDropSelector(_KDB, key) {
    const selectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.dragDrop
      : null;

    return selectors && selectors[key] ? selectors[key] : _pageChrome.dragDrop.strings[key];
  }

  function readOwnerDocument(_KDB) {
    const hostEl = _KDB && _KDB.elements && _KDB.elements.kdbWidget ? _KDB.elements.kdbWidget : null;

    return hostEl && hostEl.ownerDocument ? hostEl.ownerDocument : document;
  }

  function readDashboardDropboxes(_KDB) {
    if (_KDB && _KDB.elements && typeof _KDB.elements.dashboardDropboxes === "function") {
      return _data.toArray(_KDB.elements.dashboardDropboxes());
    }
    return _data.toArray(readOwnerDocument(_KDB).querySelectorAll(readDragDropSelector(_KDB, "canvasDropboxSelector")));
  }

  // Dropbox elements that belong to one page: the page element itself or the dropboxes inside it.
  function readPageDropboxes(_KDB, pageId) {
    const pageEl = pageId ? readOwnerDocument(_KDB).getElementById(pageId) : null;
    const selector = readDragDropSelector(_KDB, "canvasDropboxSelector");

    if (!pageEl) {
      return [];
    }
    if (typeof pageEl.matches === "function" && pageEl.matches(selector)) {
      return [pageEl];
    }
    return _data.toArray(pageEl.querySelectorAll(selector));
  }

  function resolveClosestBoundDropbox(_KDB, node, options) {
    return resolveFromElementsRegistry(_KDB, node)
      || resolveClosestBySelector(node, "[kdb_dropbox='true']")
      || resolveClosestBySelector(node, readDragDropSelector(_KDB, "canvasDropboxSelector"))
      || (options && options.currentTarget)
      || null;
  }

  function resolveFromElementsRegistry(_KDB, node) {
    if (_KDB && _KDB.elements && typeof _KDB.elements.closestBoundDropbox === "function") {
      return _KDB.elements.closestBoundDropbox(node);
    }
    return null;
  }

  function resolveClosestBySelector(node, selector) {
    if (!node || typeof node.closest !== "function" || !selector) {
      return null;
    }
    return node.closest(selector);
  }

  function readHelperTabIds(_KDB) {
    const launchpadApi = _KDB && _KDB.api ? _KDB.api.launchpad : null;
    const launchpadState = launchpadApi && typeof launchpadApi.getState === "function"
      ? launchpadApi.getState()
      : (_KDB && _KDB.state ? _KDB.state.launchpad : null);
    const helperTabIds = launchpadState && Array.isArray(launchpadState.helperTabIds)
      ? launchpadState.helperTabIds
      : [];

    return helperTabIds.map(String);
  }

  function resolveTabElement(_KDB, dropboxEl) {
    if (!dropboxEl) {
      return null;
    }
    if (dropboxEl.parentNode && dropboxEl.parentNode.id) {
      return dropboxEl.parentNode;
    }
    const containerSelector = readDragDropSelector(_KDB, "pageContainerSelector");

    return typeof dropboxEl.closest === "function" && containerSelector ? dropboxEl.closest(containerSelector) : null;
  }

  function readParentTabId(_KDB, dropboxEl) {
    const tabEl = resolveTabElement(_KDB, dropboxEl);

    return tabEl && tabEl.id ? String(tabEl.id).trim() : null;
  }

  function isHelperDropbox(_KDB, dropboxEl, helperTabIds) {
    const dropboxId = String(dropboxEl.id || "").trim();
    const tabId = readParentTabId(_KDB, dropboxEl);

    return helperTabIds.indexOf(dropboxId) !== -1
      || (tabId != null && helperTabIds.indexOf(tabId) !== -1);
  }

  return {
    isHelperDropbox: isHelperDropbox,
    readDashboardDropboxes: readDashboardDropboxes,
    readDragDropSelector: readDragDropSelector,
    readHelperTabIds: readHelperTabIds,
    readPageDropboxes: readPageDropboxes,
    readParentTabId: readParentTabId,
    resolveClosestBoundDropbox: resolveClosestBoundDropbox,
    resolveTabElement: resolveTabElement
  };
});
