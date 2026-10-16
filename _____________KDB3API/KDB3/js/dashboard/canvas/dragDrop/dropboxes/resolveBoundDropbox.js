define(["../../../../core/cognosHost/config/pageChromeSelectors.js"], function (_pageChrome) {
  "use strict";

  function readCanvasDropboxSelector(_KDB) {
    const selectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.dragDrop
      : null;

    return selectors && selectors.canvasDropboxSelector
      ? selectors.canvasDropboxSelector
      : _pageChrome.dragDrop.strings.canvasDropboxSelector;
  }

  function readDashboardDropboxes(_KDB) {
    const documentRef = readOwnerDocument(_KDB);

    if (_KDB && _KDB.elements && typeof _KDB.elements.dashboardDropboxes === "function") {
      return toArray(_KDB.elements.dashboardDropboxes());
    }
    if (!documentRef || typeof documentRef.querySelectorAll !== "function") {
      return [];
    }
    return toArray(documentRef.querySelectorAll(readCanvasDropboxSelector(_KDB)));
  }

  function resolveClosestBoundDropbox(_KDB, _node, _options) {
    const options = _options || {};

    return resolveFromElementsRegistry(_KDB, _node)
      || resolveClosestBySelector(_KDB, _node, "[kdb_dropbox='true']")
      || resolveClosestBySelector(_KDB, _node, readCanvasDropboxSelector(_KDB))
      || options.currentTarget
      || null;
  }

  function resolveFromElementsRegistry(_KDB, node) {
    if (_KDB && _KDB.elements && typeof _KDB.elements.closestBoundDropbox === "function") {
      return _KDB.elements.closestBoundDropbox(node);
    }
    return null;
  }

  function resolveClosestBySelector(_KDB, node, selector) {
    if (!node || typeof node.closest !== "function" || !selector) {
      return null;
    }
    return node.closest(selector);
  }

  function readOwnerDocument(_KDB) {
    const hostEl = _KDB && _KDB.elements && _KDB.elements.kdbWidget
      ? _KDB.elements.kdbWidget
      : null;

    return hostEl && hostEl.ownerDocument ? hostEl.ownerDocument : document;
  }

  function toArray(value) {
    return Array.prototype.slice.call(value || []);
  }

  return {
    readCanvasDropboxSelector: readCanvasDropboxSelector,
    readDashboardDropboxes: readDashboardDropboxes,
    resolveClosestBoundDropbox: resolveClosestBoundDropbox
  };
});
