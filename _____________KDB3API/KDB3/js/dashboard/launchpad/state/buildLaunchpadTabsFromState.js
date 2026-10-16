define([
  "./buildLaunchpadTabDescriptor.js"
], function (_buildLaunchpadTabDescriptor) {
  function __controller(_tabsSnapshot, _helperTabIds) {
    const snapshot = _tabsSnapshot || {};
    const order = readPresentationOrder(snapshot);
    const byIndex = snapshot.byIndex || {};
    const helperTabIds = Array.isArray(_helperTabIds) ? _helperTabIds : [];
    const tabs = [];
    let outputIndex = 0;
    let orderIndex = 0;

    while (orderIndex < order.length) {
      outputIndex = appendStateTab(tabs, byIndex[order[orderIndex]], helperTabIds, outputIndex);
      orderIndex += 1;
    }

    return tabs;
  }

  function readPresentationOrder(snapshot) {
    const byIndex = snapshot.byIndex || {};

    if (Array.isArray(snapshot.presentationOrder)) {
      return snapshot.presentationOrder.slice();
    }

    return Object.keys(byIndex).sort(sortNumericStrings);
  }

  function appendStateTab(tabs, _tabState, helperTabIds, outputIndex) {
    const tabState = _tabState || {};

    if (!tabState || doesHelperListContain(helperTabIds, tabState.tabId || tabState.id)) {
      return outputIndex;
    }

    tabs.push(_buildLaunchpadTabDescriptor(tabState, outputIndex));
    return outputIndex + 1;
  }

  function doesHelperListContain(helperTabIds, tabId) {
    let index = 0;

    while (index < helperTabIds.length) {
      if (helperTabIds[index] === tabId) {
        return true;
      }

      index += 1;
    }

    return false;
  }

  function sortNumericStrings(left, right) {
    return Number(left) - Number(right);
  }

  return __controller;
});
