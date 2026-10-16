define(["./config/selectors.js"], function (_selectors) {
  "use strict";

  function readTabItemIndex(item) {
    const rawIndex = item && item.getAttribute ? item.getAttribute(_selectors.tabIndexAttribute) : null;
    const index = rawIndex == null ? NaN : Number(rawIndex);
    return index >= _selectors.tabIndexBase && index === Math.floor(index) ? index : null;
  }

  // Sparse array keyed by the Cognos tab index; first wrapper per index wins.
  function collectTabButtonWrappers(selector) {
    if (!selector || typeof document === "undefined" || !document.querySelectorAll) { return []; }
    const buttons = [];
    const wrappers = document.querySelectorAll(selector);
    let position = 0;
    while (position < wrappers.length) {
      const wrapper = wrappers[position];
      const item = wrapper && wrapper.querySelector ? wrapper.querySelector(_selectors.tabButtonItemSelector) : null;
      const index = readTabItemIndex(item);
      if (index != null && !buttons[index]) { buttons[index] = wrapper; }
      position += 1;
    }
    return buttons;
  }

  function readPrimaryTabButtons() {
    return collectTabButtonWrappers(_selectors.primaryTabButtonSelector);
  }

  function readTabButtons(_KDB) {
    if (typeof document === "undefined" || !document.querySelectorAll) { return []; }
    const primary = readPrimaryTabButtons();
    const buttons = primary.length > 0 ? primary : collectTabButtonWrappers(_selectors.fallbackTabButtonSelector);
    const runtime = _KDB && _KDB.runtime && _KDB.runtime.tabs;
    if (runtime && runtime.domRefs) { runtime.domRefs.buttons = buttons; }
    return buttons;
  }

  function resolveTabWrapper(_KDB, tabIndex) {
    const runtime = _KDB.runtime && _KDB.runtime.tabs;
    const cached = runtime && runtime.domRefs && runtime.domRefs.buttons;
    if (cached && cached[tabIndex]) { return cached[tabIndex]; }
    if (typeof document === "undefined" || !document.querySelectorAll) { return null; }
    const wrappers = document.querySelectorAll(_selectors.tabWrapperSelector || _selectors.primaryTabButtonSelector);
    let position = 0;
    while (position < wrappers.length) {
      const wrapper = wrappers[position];
      const item = wrapper && wrapper.querySelector ? wrapper.querySelector(_selectors.tabButtonItemSelector) : null;
      if (readTabItemIndex(item) === tabIndex) { return wrapper; }
      position += 1;
    }
    return null;
  }

  function resolveLabelNode(wrapperEl) {
    if (!wrapperEl || !wrapperEl.querySelector) { return null; }
    const selectors = _selectors.tabLabelSelectors || [];
    let position = 0;
    while (position < selectors.length) {
      const node = wrapperEl.querySelector(selectors[position]);
      if (node) { return node; }
      position += 1;
    }
    return null;
  }

  function resolveTabListElement() {
    if (typeof document === "undefined" || !document.querySelector) { return null; }
    const item = document.querySelector(_selectors.tabButtonItemSelector);
    if (!item) { return null; }
    const tabListEl = typeof item.closest === "function" ? item.closest(_selectors.tabListSelector) : null;
    return tabListEl || (item.parentElement && item.parentElement.parentElement) || item.parentElement;
  }

  // aria-selected only: the active-tab observer watches exactly this attribute.
  function readAriaSelectedTabIndex() {
    if (typeof document === "undefined" || !document.querySelectorAll) { return null; }
    const items = document.querySelectorAll(_selectors.tabButtonItemSelector);
    let position = 0;
    while (position < items.length) {
      const item = items[position];
      if (item.getAttribute(_selectors.activeSelectedAttribute) === _selectors.activeSelectedValue) {
        return readTabItemIndex(item);
      }
      position += 1;
    }
    return null;
  }

  // Registered as the chromeReaders.readSelectedTabIndex of _KDB.utils.readCurrentTab; -1 when none.
  function readSelectedTabIndexFromChrome(_root) {
    const root = resolveChromeRoot(_root);
    if (!root || typeof root.querySelectorAll !== "function") { return -1; }
    const items = root.querySelectorAll(_selectors.tabButtonItemSelector);
    let position = 0;
    while (position < items.length) {
      if (isSelectedTabChrome(items[position])) {
        const parsed = readTabItemIndex(items[position]);
        return parsed != null ? parsed : position;
      }
      position += 1;
    }
    return -1;
  }

  function resolveChromeRoot(_root) {
    if (_root && typeof _root.querySelectorAll === "function") { return _root; }
    return typeof document !== "undefined" ? document : null;
  }

  function isSelectedTabChrome(item) {
    if (!item) { return false; }
    if (
      item.getAttribute &&
      _selectors.activeSelectedAttribute &&
      item.getAttribute(_selectors.activeSelectedAttribute) === _selectors.activeSelectedValue
    ) {
      return true;
    }
    if (!item.classList) { return false; }
    if (item.classList.contains("is-selected")) { return true; }
    return hasAnyClass(item, _selectors.activeClassNames);
  }

  function isButtonActive(button) {
    if (!button) { return false; }
    if (button.getAttribute && button.getAttribute(_selectors.activeSelectedAttribute) === _selectors.activeSelectedValue) {
      return true;
    }
    return !!button.classList && hasAnyClass(button, _selectors.activeClassNames);
  }

  function hasAnyClass(node, classNames) {
    return Array.isArray(classNames) && classNames.some(function (className) {
      return !!className && node.classList.contains(className);
    });
  }

  function readClickedTabIndex(_event) {
    const target = _event && _event.target;
    if (!target || typeof target.closest !== "function") { return null; }
    const item = target.closest(_selectors.tabButtonItemSelector);
    if (!item || typeof item.getAttribute !== "function") { return null; }
    return readTabItemIndex(item);
  }

  function clickTabChromeButton(button) {
    const target = button && button.querySelector ? button.querySelector(_selectors.tabButtonItemSelector) || button : button;
    if (target && typeof target.click === "function") { target.click(); }
  }

  return {
    readTabItemIndex: readTabItemIndex,
    readTabButtons: readTabButtons,
    readPrimaryTabButtons: readPrimaryTabButtons,
    resolveTabWrapper: resolveTabWrapper,
    resolveLabelNode: resolveLabelNode,
    resolveTabListElement: resolveTabListElement,
    readAriaSelectedTabIndex: readAriaSelectedTabIndex,
    readSelectedTabIndexFromChrome: readSelectedTabIndexFromChrome,
    isButtonActive: isButtonActive,
    readClickedTabIndex: readClickedTabIndex,
    clickTabChromeButton: clickTabChromeButton
  };
});
