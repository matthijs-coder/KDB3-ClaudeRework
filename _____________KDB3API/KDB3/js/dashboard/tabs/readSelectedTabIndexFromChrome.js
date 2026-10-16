define(["./config/selectors.js"], function (_domSelectors) {
  "use strict";

  function readSelectedTabIndexFromChrome(_root) {
    const root = resolveChromeRoot(_root);
    if (!root || typeof root.querySelectorAll !== "function") {
      return -1;
    }
    const items = root.querySelectorAll(_domSelectors.tabButtonItemSelector);
    let index = 0;
    let item;
    let parsed;
    while (index < items.length) {
      item = items[index];
      if (isSelectedTabChrome(item)) {
        parsed = readTabItemIndex(item);
        return parsed != null ? parsed : index;
      }
      index += 1;
    }
    return -1;
  }

  function resolveChromeRoot(_root) {
    if (_root && typeof _root.querySelectorAll === "function") {
      return _root;
    }
    if (typeof document !== "undefined") {
      return document;
    }
    return null;
  }

  function isSelectedTabChrome(item) {
    if (!item) {
      return false;
    }
    if (
      item.getAttribute &&
      _domSelectors.activeSelectedAttribute &&
      item.getAttribute(_domSelectors.activeSelectedAttribute) === _domSelectors.activeSelectedValue
    ) {
      return true;
    }
    if (!item.classList) {
      return false;
    }
    if (item.classList.contains("is-selected")) {
      return true;
    }
    const names = _domSelectors.activeClassNames;
    if (!Array.isArray(names)) {
      return false;
    }
    let i;
    for (i = 0; i < names.length; i += 1) {
      if (names[i] && item.classList.contains(names[i])) {
        return true;
      }
    }
    return false;
  }

  function readTabItemIndex(item) {
    const rawIndex = item && item.getAttribute
      ? item.getAttribute(_domSelectors.tabIndexAttribute)
      : null;
    const parsedIndex = rawIndex == null ? NaN : Number(rawIndex);
    return parsedIndex >= _domSelectors.tabIndexBase && parsedIndex === Math.floor(parsedIndex)
      ? parsedIndex
      : null;
  }

  return readSelectedTabIndexFromChrome;
});
