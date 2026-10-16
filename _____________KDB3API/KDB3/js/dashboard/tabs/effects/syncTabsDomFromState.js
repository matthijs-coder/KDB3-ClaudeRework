define(["../config/defaults.js", "../config/selectors.js"], function (_defaults, _selectors) {
  "use strict";

  function __controller(_KDB, _state) {
    try {
      const state = _state || (_KDB.state && _KDB.state.tabs);
      const buttons = readTabButtons(_KDB);
      syncButtonMarkers(_KDB, buttons);
      syncButtonVisibility(_KDB, buttons, state);
      syncButtonLabels(_KDB, buttons, state);
      return true;
    } catch (err) {
      console.error("[tabs.syncTabsDomFromState] DOM sync failed", err);
      throw err;
    }
  }

  function readTabButtons(_KDB) {
    try {
      if (typeof document === "undefined" || !document.querySelectorAll) { return []; }
      const primary = collectRealTabButtonWrappers(_selectors.primaryTabButtonSelector);
      const buttons = primary.length > 0 ? primary : collectRealTabButtonWrappers(_selectors.fallbackTabButtonSelector);
      const runtime = _KDB.runtime && _KDB.runtime.tabs;
      if (runtime && runtime.domRefs) { runtime.domRefs.buttons = buttons; }
      return buttons;
    } catch (err) {
      console.error("[tabs.readTabButtons] read failed", err);
      throw err;
    }
  }

  function syncButtonMarkers(_KDB, buttons) {
    try {
      buttons.forEach(function (button, index) {
        if (!button || !button.classList) { return; }
        const role = readTabRole(_KDB, index);
        button.classList.toggle(_defaults.USER_TAB_BUTTON_CLASS, role === "dashboard");
        button.classList.toggle(_defaults.HELPER_TAB_BUTTON_CLASS, role !== "dashboard");
      });
    } catch (err) {
      console.error("[tabs.syncButtonMarkers] marker sync failed", err);
      throw err;
    }
  }

  function syncButtonVisibility(_KDB, buttons, state) {
    try {
      buttons.forEach(function (button, index) {
        const tab = state && state.byIndex ? state.byIndex[String(index)] : null;
        const role = readTabRole(_KDB, index);
        const isVisible = (state && state.isAuthoringView === true) || (role === "dashboard" && !!(tab && tab.visible === true));
        if (button && button.classList) { button.classList.toggle(_defaults.VISIBLE_CLASS, isVisible); }
      });
    } catch (err) {
      console.error("[tabs.syncButtonVisibility] visibility sync failed", err);
      throw err;
    }
  }

  // Cognos' title property does not drive the visible tab-button text; like
  // legacy KDB2, programmatic renames must write the label node directly.
  // State is the source of truth here (hydrated from DOM at mount, updated by
  // rename/restore/mutation commits before this sync runs).
  function syncButtonLabels(_KDB, buttons, state) {
    try {
      buttons.forEach(function (button, index) {
        if (readTabRole(_KDB, index) !== "dashboard") { return; }
        const tab = state && state.byIndex ? state.byIndex[String(index)] : null;
        if (!tab || typeof tab.name !== "string" || tab.name === "") { return; }
        const labelEl = resolveLabelNode(button);
        if (!labelEl) { return; }
        // Never fight an active rename edit session on this label.
        if (labelEl.getAttribute && labelEl.getAttribute("contenteditable") === "true") { return; }
        if (labelEl.textContent !== tab.name) { labelEl.textContent = tab.name; }
      });
    } catch (err) {
      console.error("[tabs.syncButtonLabels] label sync failed", err);
      throw err;
    }
  }

  function resolveLabelNode(wrapperEl) {
    if (!wrapperEl || !wrapperEl.querySelector) { return null; }
    const selectors = _selectors.tabLabelSelectors || [];
    for (let index = 0; index < selectors.length; index += 1) {
      const node = wrapperEl.querySelector(selectors[index]);
      if (node) { return node; }
    }
    return null;
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList || []);
  }

  function collectRealTabButtonWrappers(selector) {
    const buttons = [];
    toArray(document.querySelectorAll(selector)).forEach(function (wrapper) {
      const item = wrapper && wrapper.querySelector ? wrapper.querySelector(_selectors.tabButtonItemSelector) : null;
      const index = readTabItemIndex(item);
      if (index != null && !buttons[index]) { buttons[index] = wrapper; }
    });
    return buttons;
  }

  function readTabItemIndex(item) {
    const rawIndex = item && item.getAttribute ? item.getAttribute(_selectors.tabIndexAttribute) : null;
    const index = rawIndex == null ? NaN : Number(rawIndex);
    return index >= _selectors.tabIndexBase && index === Math.floor(index) ? index : null;
  }

  function readTabRole(_KDB, index) {
    const tabsConfig = _KDB && _KDB.config ? _KDB.config.tabs : null;
    const entry = tabsConfig && tabsConfig[String(index)];
    return entry && entry.role ? entry.role : null;
  }

  return __controller;
});
