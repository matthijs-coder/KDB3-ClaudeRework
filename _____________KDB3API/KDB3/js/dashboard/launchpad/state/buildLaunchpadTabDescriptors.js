define([
  "./collectLaunchpadTabIndexes.js",
  "./buildLaunchpadTabsFromState.js",
  "./buildLaunchpadTabsFromConfig.js",
  "./buildLaunchpadTabsFromCanvas.js",
  "./resolveLaunchpadHelperTabs.js",
  "./readLaunchpadTabSources.js"
], function (
  _collectLaunchpadTabIndexes,
  _buildLaunchpadTabsFromState,
  _buildLaunchpadTabsFromConfig,
  _buildLaunchpadTabsFromCanvas,
  _resolveLaunchpadHelperTabs,
  _readLaunchpadTabSources
) {
  function __controller(_KDB, _options) {
    try {
      const options = _options || {};
      const sources = _readLaunchpadTabSources(_KDB, options);
      const tabsConfig = sources.tabsConfig;
      const tabsSnapshot = sources.tabsSnapshot;
      const layoutItems = sources.layoutItems;
      const tabIndexes = _collectLaunchpadTabIndexes(tabsConfig);
      const helperTabs = resolveHelperTabs(tabsSnapshot, tabsConfig, layoutItems, tabIndexes.helperTabIndexes);
      const tabs = readTabs(_KDB, tabsSnapshot, layoutItems, tabIndexes.dashboardTabIndexes, helperTabs.helperTabIds);

      return {
        helperTabIds: helperTabs.helperTabIds,
        helperTabPageId: helperTabs.helperTabPageId,
        tabs: tabs
      };
    } catch (err) {
      console.error("[launchpad.buildLaunchpadTabDescriptors] failed", err);
      throw err;
    }
  }

  function resolveHelperTabs(tabsSnapshot, tabsConfig, layoutItems, helperTabIndexes) {
    const helperTabs = _resolveLaunchpadHelperTabs(tabsSnapshot, tabsConfig);

    if (helperTabs.helperTabIds.length > 0) {
      return helperTabs;
    }

    return resolveHelperTabsFromLayout(layoutItems, helperTabIndexes);
  }

  function resolveHelperTabsFromLayout(layoutItems, helperTabIndexes) {
    const helperTabIds = [];
    let helperTabPageId = null;
    let index = 0;

    while (index < helperTabIndexes.length) {
      helperTabPageId = appendHelperTab(helperTabIds, layoutItems[helperTabIndexes[index]], helperTabPageId);
      index += 1;
    }

    return {
      helperTabIds: helperTabIds,
      helperTabPageId: helperTabPageId
    };
  }

  function appendHelperTab(helperTabIds, layoutItem, helperTabPageId) {
    const tabId = resolveLayoutTabId(layoutItem);

    if (tabId) {
      helperTabIds.push(tabId);
      return helperTabPageId || tabId;
    }

    return helperTabPageId;
  }

  function resolveLayoutTabId(layoutItem) {
    if (layoutItem && layoutItem.id) {
      return layoutItem.id;
    }

    if (layoutItem && Array.isArray(layoutItem.items) && layoutItem.items[0] && layoutItem.items[0].id) {
      return layoutItem.items[0].id;
    }

    return null;
  }

  function readTabs(_KDB, tabsSnapshot, layoutItems, dashboardTabIndexes, helperTabIds) {
    const tabsFromState = _buildLaunchpadTabsFromState(tabsSnapshot, helperTabIds);

    if (tabsFromState.length > 0) {
      return tabsFromState;
    }

    return readTabsFromConfigOrCanvas(_KDB, layoutItems, dashboardTabIndexes);
  }

  function readTabsFromConfigOrCanvas(_KDB, layoutItems, dashboardTabIndexes) {
    const tabsFromConfig = dashboardTabIndexes.length > 0 ? _buildLaunchpadTabsFromConfig(layoutItems, dashboardTabIndexes) : [];

    if (tabsFromConfig.length > 0) {
      return tabsFromConfig;
    }

    return _buildLaunchpadTabsFromCanvas(_KDB);
  }

  return __controller;
});
