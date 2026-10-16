define([
  "./collectLaunchpadTabIndexes.js",
  "./buildLaunchpadTabDescriptor.js"
], function (_collectLaunchpadTabIndexes, _buildLaunchpadTabDescriptor) {
  function __controller(_tabsSnapshot, _tabsConfig) {
    const snapshotHelper = readSnapshotHelperTab(_tabsSnapshot);

    if (snapshotHelper.tabId) {
      return {
        helperTabIds: [snapshotHelper.tabId],
        helperTabPageId: snapshotHelper.pageId
      };
    }

    return readConfigHelperTabs(_tabsConfig);
  }

  function readSnapshotHelperTab(_tabsSnapshot) {
    const helperTab = _tabsSnapshot && _tabsSnapshot.helperTab;

    if (!helperTab) {
      return { tabId: null, pageId: null };
    }

    return {
      tabId: helperTab.tabId || helperTab.id || null,
      pageId: helperTab.pageId || helperTab.page || null
    };
  }

  function readConfigHelperTabs(_tabsConfig) {
    const tabIndexes = _collectLaunchpadTabIndexes(_tabsConfig);
    const helperTabIds = [];
    let helperTabPageId = null;
    let index = 0;

    while (index < tabIndexes.helperTabIndexes.length) {
      helperTabPageId = appendConfigHelperTab(helperTabIds, _tabsConfig, tabIndexes.helperTabIndexes[index], helperTabPageId);
      index += 1;
    }

    return {
      helperTabIds: helperTabIds,
      helperTabPageId: helperTabPageId
    };
  }

  function appendConfigHelperTab(helperTabIds, _tabsConfig, helperIndex, helperTabPageId) {
    const tabConfig = readConfigTabByIndex(_tabsConfig, helperIndex);
    const descriptor = _buildLaunchpadTabDescriptor(tabConfig, helperIndex);

    helperTabIds.push(descriptor.tabId);

    if (!helperTabPageId) {
      return descriptor.pageId;
    }

    return helperTabPageId;
  }

  function readConfigTabByIndex(_tabsConfig, helperIndex) {
    if (Array.isArray(_tabsConfig)) {
      return _tabsConfig[helperIndex] || {};
    }

    if (_tabsConfig && Array.isArray(_tabsConfig.tabs)) {
      return _tabsConfig.tabs[helperIndex] || {};
    }

    return readConfigObjectTabByIndex(_tabsConfig, helperIndex);
  }

  function readConfigObjectTabByIndex(_tabsConfig, helperIndex) {
    const keys = _tabsConfig && typeof _tabsConfig === "object" ? Object.keys(_tabsConfig) : [];
    let index = 0;

    while (index < keys.length) {
      const tabConfig = _tabsConfig[keys[index]] || {};

      if (Number(tabConfig.corTabIndex || tabConfig.index) === helperIndex) {
        return tabConfig;
      }

      index += 1;
    }

    return {};
  }

  return __controller;
});
