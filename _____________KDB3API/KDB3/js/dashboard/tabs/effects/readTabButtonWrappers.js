define(["../config/selectors.js"], function (_selectors) {
  "use strict";

  function readTabButtons(_KDB) {
    try {
      if (typeof document === "undefined" || !document.querySelectorAll) { return []; }
      const primary = collectRealTabButtonWrappers(_selectors.primaryTabButtonSelector);
      const buttons = primary.length > 0 ? primary : collectRealTabButtonWrappers(_selectors.fallbackTabButtonSelector);
      const runtime = _KDB.runtime && _KDB.runtime.tabs;
      if (runtime && runtime.domRefs) { runtime.domRefs.buttons = buttons; }
      return buttons;
    } catch (err) {
      console.error("[tabs.traverse.readTabButtons] read failed", err);
      throw err;
    }
  }

  function collectRealTabButtonWrappers(selector) {
    const buttons = [];
    const wrappers = toArray(document.querySelectorAll(selector));
    let index = 0;
    while (index < wrappers.length) {
      const wrapper = wrappers[index];
      const item = wrapper && wrapper.querySelector ? wrapper.querySelector(_selectors.tabButtonItemSelector) : null;
      const tabIndex = readTabItemIndex(item);
      if (tabIndex != null && !buttons[tabIndex]) { buttons[tabIndex] = wrapper; }
      index += 1;
    }
    return buttons;
  }

  function readTabItemIndex(item) {
    const rawIndex = item && item.getAttribute ? item.getAttribute(_selectors.tabIndexAttribute) : null;
    const index = rawIndex == null ? NaN : Number(rawIndex);
    return index >= _selectors.tabIndexBase && index === Math.floor(index) ? index : null;
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList || []);
  }

  return readTabButtons;
});
