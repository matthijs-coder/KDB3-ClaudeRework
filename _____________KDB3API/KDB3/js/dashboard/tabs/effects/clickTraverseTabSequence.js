define(["../config/defaults.js", "./clickTabChromeButton.js", "./resolveTraverseTabIndexes.js", "./awaitTabWidgetsRendered.js"], function (_defaults, _clickTabChromeButton, _resolveTraverseTabIndexes, _awaitTabWidgetsRendered) {
  "use strict";

  const LOG_PREFIX = "[tabs.traverse]";

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
        logTraverse("traversing tab", Object.assign({
          source: options.source,
          scope: options.scope,
          tabIndex: options.scope === "singleTab" ? options.tabIndex : tabIndex
        }, formatTabInfo(tab, tabIndex)));
        _clickTabChromeButton(buttons[tabIndex]);
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
      const activeTab = state && state.byIndex && state.byIndex[String(activeIndex)];
      logTraverse("restored active tab", Object.assign({
        source: options.source,
        scope: options.scope,
        tabIndex: options.scope === "singleTab" ? options.tabIndex : null,
        activeIndex: activeIndex
      }, formatTabInfo(activeTab, activeIndex)));
      _clickTabChromeButton(buttons[activeIndex]);
    } catch (err) {
      console.error("[tabs.restoreActiveButton] restore failed", err);
      throw err;
    }
  }

  function logTraverse(message, data) {
    if (data !== undefined) { console.log(LOG_PREFIX, message, data); }
    else { console.log(LOG_PREFIX, message); }
  }

  function formatTabInfo(tab, tabIndex) {
    return {
      index: tabIndex,
      tabId: tab && tab.tabId || null,
      name: tab && tab.name || null,
      visible: tab ? tab.visible : undefined,
      role: tab && tab.role || null
    };
  }

  function isDisposed(_ctx) {
    return _ctx && typeof _ctx.isDisposed === "function" && _ctx.isDisposed();
  }

  clickTargetTabs.restoreActiveButton = restoreActiveButton;
  return clickTargetTabs;
});
