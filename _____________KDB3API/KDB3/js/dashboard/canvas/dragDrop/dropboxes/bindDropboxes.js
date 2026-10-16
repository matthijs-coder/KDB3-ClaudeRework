define([
  "./readHelperTabIds.js",
  "./resolveBoundDropbox.js",
  "./updateDragHover.js",
  "./publishValidatedDrop.js"
], function (_readHelperTabIds, _resolveBoundDropbox, _updateDragHover, _publishValidatedDrop) {
  "use strict";

  function __controller(_KDB, _runtime, _dispatch, _completeDrop) {
    try {
      const dropboxes = _resolveBoundDropbox.readDashboardDropboxes(_KDB);
      const helperTabIds = _readHelperTabIds(_KDB);
      let index;

      cleanupDropboxListeners(_runtime);
      _runtime.dropboxesById = {};
      _runtime.helperTabIds = helperTabIds;
      for (index = 0; index < dropboxes.length; index += 1) {
        bindDropbox(_KDB, dropboxes[index], _runtime, helperTabIds, _dispatch, _completeDrop);
      }
      return true;
    } catch (error) {
      console.error("[dragDrop.bindDropboxes] bind failed", error);
      return false;
    }
  }

  function bindDropbox(_KDB, dropboxEl, _runtime, helperTabIds, _dispatch, _completeDrop) {
    const dropboxId = dropboxEl && dropboxEl.id ? String(dropboxEl.id).trim() : "";

    if (!dropboxEl || isHelperDropbox(_KDB, dropboxEl, dropboxId, helperTabIds)) {
      return false;
    }
    dropboxEl.setAttribute("data-kdb-drag-drop-bound", "true");
    dropboxEl.setAttribute("kdb_dropbox", "true");
    addDropboxListener(_KDB, dropboxEl, _runtime, "dragenter", onDragEnter, _dispatch, _completeDrop);
    addDropboxListener(_KDB, dropboxEl, _runtime, "dragover", onDragOver, _dispatch, _completeDrop);
    addDropboxListener(_KDB, dropboxEl, _runtime, "dragleave", onDragLeave, _dispatch, _completeDrop);
    addDropboxListener(_KDB, dropboxEl, _runtime, "drop", onDrop, _dispatch, _completeDrop);
    if (dropboxId) {
      _runtime.dropboxesById[dropboxId] = dropboxEl;
    }
    return true;
  }

  function isHelperDropbox(_KDB, dropboxEl, dropboxId, helperTabIds) {
    const tabId = readParentTabId(_KDB, dropboxEl);
    return helperTabIds.indexOf(dropboxId) !== -1
      || (tabId != null && helperTabIds.indexOf(tabId) !== -1);
  }

  function readPageContainerSelector(_KDB) {
    var dragDrop = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.dragDrop;
    return dragDrop && dragDrop.pageContainerSelector ? dragDrop.pageContainerSelector : null;
  }

  function readParentTabId(_KDB, dropboxEl) {
    const pageContainerSelector = readPageContainerSelector(_KDB);
    const tabEl = dropboxEl && dropboxEl.parentNode && dropboxEl.parentNode.id
      ? dropboxEl.parentNode
      : (dropboxEl && dropboxEl.closest && pageContainerSelector ? dropboxEl.closest(pageContainerSelector) : null);

    return tabEl && tabEl.id ? String(tabEl.id).trim() : null;
  }

  function addDropboxListener(_KDB, dropboxEl, _runtime, type, listener, _dispatch, _completeDrop) {
    const handler = listener.bind(null, _KDB, _runtime, _dispatch, _completeDrop);
    const record = { target: dropboxEl, type: type, handler: handler };

    dropboxEl.addEventListener(type, handler);
    _runtime.listeners.dropboxes.push(record);
  }

  function onDragEnter(_KDB, _runtime, _dispatch, _completeDrop, event) {
    return _updateDragHover.handleDragEnter(_KDB, event, _runtime);
  }

  function onDragOver(_KDB, _runtime, _dispatch, _completeDrop, event) {
    return _updateDragHover.handleDragOver(_KDB, event, _runtime);
  }

  function onDragLeave(_KDB, _runtime, _dispatch, _completeDrop, event) {
    return _updateDragHover.handleDragLeave(_KDB, event, _runtime);
  }

  function onDrop(_KDB, _runtime, _dispatch, _completeDrop, event) {
    return _publishValidatedDrop(_KDB, event, _runtime, _dispatch, _completeDrop);
  }

  function cleanupDropboxListeners(_runtime) {
    const listeners = _runtime && _runtime.listeners && Array.isArray(_runtime.listeners.dropboxes)
      ? _runtime.listeners.dropboxes
      : [];
    let index;

    for (index = 0; index < listeners.length; index += 1) {
      removeListenerRecord(listeners[index]);
    }
    if (_runtime && _runtime.listeners) {
      _runtime.listeners.dropboxes = [];
    }
  }

  function removeListenerRecord(record) {
    if (record && record.target && record.type && record.handler) {
      record.target.removeEventListener(record.type, record.handler);
      if (record.target.getAttribute("data-kdb-drag-drop-bound") === "true") {
        record.target.removeAttribute("data-kdb-drag-drop-bound");
        record.target.removeAttribute("kdb_dropbox");
      }
    }
  }

  return __controller;
});
