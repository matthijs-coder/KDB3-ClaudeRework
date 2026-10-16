define([
  "./buildLaunchpadTabDescriptor.js"
], function (_buildLaunchpadTabDescriptor) {
  function __controller(_layoutItems, _dashboardIndexes) {
    const layoutItems = Array.isArray(_layoutItems) ? _layoutItems : [];
    const dashboardIndexes = Array.isArray(_dashboardIndexes) ? _dashboardIndexes : [];
    const tabs = [];
    let index = 0;

    while (index < dashboardIndexes.length) {
      appendConfigTab(tabs, layoutItems, dashboardIndexes[index]);
      index += 1;
    }

    return tabs;
  }

  function appendConfigTab(tabs, layoutItems, dashboardIndex) {
    const layoutIndex = Number(dashboardIndex);
    const layoutItem = Number.isFinite(layoutIndex) ? layoutItems[layoutIndex] : undefined;
    const source = layoutItem ? normalizeLayoutItem(layoutItem, layoutIndex) : null;
    const descriptor = source ? _buildLaunchpadTabDescriptor(source, layoutIndex) : null;

    if (!descriptor || !source.tabId) {
      return;
    }

    descriptor.childIndex = tabs.length;
    tabs.push(descriptor);
  }

  function normalizeLayoutItem(layoutItem, layoutIndex) {
    const tabId = resolveLayoutItemId(layoutItem) || resolvePageId(layoutItem);
    const pageId = tabId;

    return {
      aliases: readAliases(tabId),
      childIndex: layoutIndex,
      corTabIndex: layoutIndex,
      pageId: pageId,
      tabId: tabId
    };
  }

  function resolvePageId(layoutItem) {
    if (layoutItem && Array.isArray(layoutItem.items) && layoutItem.items[0] && layoutItem.items[0].id) {
      return layoutItem.items[0].id;
    }

    return null;
  }

  function resolveLayoutItemId(layoutItem) {
    return layoutItem && layoutItem.id ? layoutItem.id : null;
  }

  function readAliases(tabId) {
    const aliases = [];

    appendAlias(aliases, tabId);

    return aliases;
  }

  function appendAlias(aliases, value) {
    if (value && aliases.indexOf(value) === -1) {
      aliases.push(value);
    }
  }

  return __controller;
});
