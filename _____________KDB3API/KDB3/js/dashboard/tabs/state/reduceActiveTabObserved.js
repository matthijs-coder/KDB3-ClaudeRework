define([], function () {
  "use strict";

  // Pure reducer for tabs/activeTabObserved: commits an activation change
  // detected by the DOM observer. No visibility mutation, no traversal-state
  // overwrite. Returns the same state reference for no-op selections.
  function reduceActiveTabObserved(_state, _payload) {
    const state = _state || {};
    const payload = _payload || {};
    const tabIndex = normalizeTabIndex(payload.tabIndex);
    if (tabIndex == null || tabIndex === state.activeIndex) { return state; }
    const key = String(tabIndex);
    if (!state.byIndex || !state.byIndex[key]) { return state; }
    const byIndex = remapActiveFlags(state.byIndex, key, payload.observedAt || Date.now(), payload.source || null);
    return Object.assign({}, state, {
      byIndex: byIndex,
      activeIndex: tabIndex,
      activeTabId: byIndex[key].tabId || null,
      currentTabId: byIndex[key].tabId || null
    });
  }

  // Pure syncFromDom companion: carries monotone activation flags over from
  // the previous state (syncFromDom rebuilds byIndex from DOM, which knows
  // nothing about hasBeenActivated) and seeds the initially active tab so the
  // startup tab never reports firstActivation: true.
  function seedSyncFromDomActivation(_previousByIndex, _nextByIndex, _activeIndex, _syncedAt) {
    const previousByIndex = _previousByIndex || {};
    const nextByIndex = _nextByIndex || {};
    Object.keys(nextByIndex).forEach(function (indexKey) {
      const previousTab = previousByIndex[indexKey];
      if (previousTab && previousTab.hasBeenActivated === true) {
        nextByIndex[indexKey] = Object.assign({}, nextByIndex[indexKey], {
          hasBeenActivated: true,
          activatedAt: previousTab.activatedAt || null,
          activatedBy: previousTab.activatedBy || null
        });
      }
    });
    const activeKey = _activeIndex == null ? null : String(_activeIndex);
    if (activeKey && nextByIndex[activeKey] && nextByIndex[activeKey].hasBeenActivated !== true) {
      nextByIndex[activeKey] = Object.assign({}, nextByIndex[activeKey], {
        hasBeenActivated: true,
        activatedAt: _syncedAt || Date.now(),
        activatedBy: "syncFromDom"
      });
    }
    return nextByIndex;
  }

  function remapActiveFlags(byIndex, activeKey, observedAt, source) {
    const next = {};
    Object.keys(byIndex || {}).forEach(function (indexKey) {
      next[indexKey] = copyTabWithActiveFlag(byIndex[indexKey], indexKey === activeKey, observedAt, source);
    });
    return next;
  }

  function copyTabWithActiveFlag(tab, isActive, observedAt, source) {
    const next = Object.assign({}, tab, { isActive: isActive });
    if (isActive && next.hasBeenActivated !== true) {
      next.hasBeenActivated = true;
      next.activatedAt = observedAt;
      next.activatedBy = source;
    }
    return next;
  }

  function normalizeTabIndex(value) {
    return typeof value === "number" && value >= 0 && value === Math.floor(value) ? value : null;
  }

  return {
    reduceActiveTabObserved: reduceActiveTabObserved,
    seedSyncFromDomActivation: seedSyncFromDomActivation
  };
});
