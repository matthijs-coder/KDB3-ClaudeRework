define(["../../../../core/cognosHost/config/pageChromeSelectors.js"], function (_pageChrome) {
  "use strict";

  function __controller(_KDB, _event, _runtime) {
    try {
      removeRuntimeElement(_runtime, "avatarEl");
      removeActiveDropbox(_runtime);
      clearMarkedSources(_runtime);
      removeLayoutGrid(_KDB);
      removeDocumentDragOverListener(_runtime);
      removeRuntimeElement(_runtime, "sourceCopyEl");
      removeRuntimeElement(_runtime, "nativeDragImageEl");
      clearNativeDragImageTimer(_runtime);
      _runtime.sourceRuntime = null;
      return true;
    } catch (error) {
      console.error("[dragDrop.finishDragSession] cleanup failed", error);
      return false;
    }
  }

  function removeRuntimeElement(_runtime, key) {
    const element = _runtime && _runtime.domRefs ? _runtime.domRefs[key] : null;

    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    if (_runtime && _runtime.domRefs) {
      _runtime.domRefs[key] = null;
    }
  }

  function removeActiveDropbox(_runtime) {
    const domRefs = _runtime && _runtime.domRefs ? _runtime.domRefs : {};
    const activeDropboxEl = domRefs.activeDropboxEl || _runtime.activeDropboxEl;

    if (activeDropboxEl && activeDropboxEl.classList) {
      activeDropboxEl.classList.remove("kdb_drag-over");
    }
    domRefs.activeDropboxEl = null;
    if (_runtime) {
      _runtime.activeDropboxEl = null;
    }
  }

  function clearMarkedSources(_runtime) {
    const markedEls = _runtime && _runtime.domRefs && Array.isArray(_runtime.domRefs.sourceMarkedEls)
      ? _runtime.domRefs.sourceMarkedEls
      : [];
    let index;

    for (index = 0; index < markedEls.length; index += 1) {
      if (markedEls[index] && markedEls[index].classList) {
        markedEls[index].classList.remove("kdb_drag-source-active");
      }
    }
    if (_runtime && _runtime.domRefs) {
      _runtime.domRefs.sourceMarkedEls = [];
    }
  }

  function readPageTemplateSelector(_KDB) {
    const selectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.dragDrop
      : null;
    return selectors && selectors.pageTemplateSelector
      ? selectors.pageTemplateSelector
      : _pageChrome.dragDrop.strings.pageTemplateSelector;
  }

  function removeLayoutGrid(_KDB) {
    const pageEls = document.querySelectorAll(readPageTemplateSelector(_KDB));
    let index;

    for (index = 0; index < pageEls.length; index += 1) {
      pageEls[index].classList.remove("KDB_absoluteLayoutGrid");
    }
  }

  function removeDocumentDragOverListener(_runtime) {
    const listeners = _runtime && _runtime.listeners ? _runtime.listeners : {};
    const record = listeners.documentDragOver;

    if (record && record.target && record.handler) {
      record.target.removeEventListener(record.type, record.handler);
    }
    if (listeners) {
      delete listeners.documentDragOver;
    }
  }

  function clearNativeDragImageTimer(_runtime) {
    const timers = _runtime && _runtime.timers ? _runtime.timers : {};

    if (timers.nativeDragImage) {
      clearTimeout(timers.nativeDragImage);
      delete timers.nativeDragImage;
    }
  }

  return __controller;
});
