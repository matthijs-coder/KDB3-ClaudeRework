define([], function () {
  "use strict";

  // Tab-scoped inner-frame predicate per
  // contracts/tabs-inner-frame-skip-empty-snapshot-contractdelta.md §2.
  // Wrapper getElementById(tabId) plus either a catalog
  // page.exactPageRootSelector descendant or a distinct pageId child.
  function hasTabInnerFrame(_KDB, _tabId, _pageId) {
    try {
      if (!isUsableId(_tabId) || typeof document === "undefined" || !document.getElementById) {
        return false;
      }
      var wrapper = document.getElementById(_tabId);
      if (!wrapper) {
        return false;
      }
      if (hasExactPageRootDescendant(wrapper, readExactPageRootSelector(_KDB))) {
        return true;
      }
      return isPageChildOfWrapper(wrapper, _tabId, resolvePageId(_KDB, _tabId, _pageId));
    } catch (err) {
      console.error("[tabs.hasTabInnerFrame] failed", _tabId, err);
      return false;
    }
  }

  function isUsableId(_value) {
    return typeof _value === "string" && _value.length > 0;
  }

  function readExactPageRootSelector(_KDB) {
    try {
      var page = _KDB && _KDB.elements && _KDB.elements.selectors
        ? _KDB.elements.selectors.page
        : null;
      var selector = page && page.exactPageRootSelector;
      return typeof selector === "string" && selector.length > 0 ? selector : null;
    } catch (err) {
      console.error("[tabs.hasTabInnerFrame] selector read failed", err);
      return null;
    }
  }

  function hasExactPageRootDescendant(_wrapper, _selector) {
    if (!_selector || !_wrapper || typeof _wrapper.querySelector !== "function") {
      return false;
    }
    return !!_wrapper.querySelector(_selector);
  }

  function resolvePageId(_KDB, _tabId, _pageId) {
    if (isUsableId(_pageId)) {
      return _pageId;
    }
    var tab = findTabById(_KDB, _tabId);
    return tab && isUsableId(tab.pageId) ? tab.pageId : null;
  }

  function findTabById(_KDB, _tabId) {
    try {
      var state = _KDB && _KDB.state ? _KDB.state.tabs : null;
      var byIndex = state && state.byIndex ? state.byIndex : {};
      var keys = Object.keys(byIndex);
      var index = 0;
      var tab;
      while (index < keys.length) {
        tab = byIndex[keys[index]];
        if (tab && tab.tabId === _tabId) {
          return tab;
        }
        index += 1;
      }
      return null;
    } catch (err) {
      console.error("[tabs.hasTabInnerFrame] tab lookup failed", _tabId, err);
      return null;
    }
  }

  function isPageChildOfWrapper(_wrapper, _tabId, _pageId) {
    if (!isUsableId(_pageId) || _pageId === _tabId) {
      return false;
    }
    var pageEl = document.getElementById(_pageId);
    if (!pageEl || pageEl === _wrapper || typeof _wrapper.contains !== "function") {
      return false;
    }
    return _wrapper.contains(pageEl);
  }

  return hasTabInnerFrame;
});
