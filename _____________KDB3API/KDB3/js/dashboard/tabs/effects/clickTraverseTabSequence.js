define(["../config/defaults.js", "../chrome.js", "./resolveTraverseTabIndexes.js", "./awaitTabWidgetsRendered.js"], function (_defaults, _chrome, _resolveTraverseTabIndexes, _awaitTabWidgetsRendered) {
  "use strict";

  async function clickTargetTabs(_ctx, buttons, state, targetIndexes, traversedIndexes, canvasLoadedByIndex, options, _delay) {
    let visitedHidden = false;
    try {
      let index = 0;
      while (index < targetIndexes.length) {
        const tabIndex = targetIndexes[index];
        const tab = state.byIndex && state.byIndex[String(tabIndex)];
        if (!_resolveTraverseTabIndexes.shouldTraverseTab(tab, tabIndex, options)) {
          index += 1;
          continue;
        }
        _chrome.clickTabChromeButton(buttons[tabIndex]);
        traversedIndexes.push(tabIndex);
        canvasLoadedByIndex[String(tabIndex)] = true;
        if (tab && tab.visible !== true) { visitedHidden = true; }
        await _delay(_ctx, _defaults.TRAVERSE_CLICK_DELAY_MS);
        if (isDisposed(_ctx)) { return visitedHidden; }
        if (options.waitFor === "widgetsRendered") {
          await _awaitTabWidgetsRendered(_ctx._KDB, tab);
          if (isDisposed(_ctx)) { return visitedHidden; }
        }
        index += 1;
      }
      return visitedHidden;
    } catch (err) {
      console.error("[tabs.clickTargetTabs] tab click failed", err);
      throw err;
    }
  }

  function restoreActiveButton(buttons, activeIndex, state, options) {
    try {
      _chrome.clickTabChromeButton(buttons[activeIndex]);
    } catch (err) {
      console.error("[tabs.restoreActiveButton] restore failed", err);
      throw err;
    }
  }

  function isDisposed(_ctx) {
    return _ctx && typeof _ctx.isDisposed === "function" && _ctx.isDisposed();
  }

  clickTargetTabs.restoreActiveButton = restoreActiveButton;
  return clickTargetTabs;
});
