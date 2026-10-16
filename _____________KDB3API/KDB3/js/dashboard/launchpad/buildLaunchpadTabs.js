define([], function () {
  "use strict";
  // Builds the launchpad tab model { helperTabIds, helperTabPageId, tabs } from four fallback sources.
  //   tabs:       tabs state snapshot -> config dashboard indexes resolved through layout items -> canvas facet
  //   helper tab: snapshot.helperTab -> config entries with role "helper"
  // Layout items come from options.layoutItems or the tabs facet (runtime.launchpad.tabsFacet.listTabs).

  function buildLaunchpadTabs(_KDB, _options) {
    const options = _options || {};
    const tabsConfig = readTabsConfig(_KDB, options);
    const tabsSnapshot = readTabsSnapshot(_KDB, options);
    const layoutItems = readLayoutItems(_KDB, options);
    const tabIndexes = collectTabIndexes(tabsConfig);
    const helperTab = resolveHelperTab(tabsSnapshot, tabsConfig, tabIndexes.helperTabIndexes);

    let tabs = buildTabsFromState(tabsSnapshot, helperTab.helperTabIds);
    if (tabs.length === 0) {
      tabs = buildTabsFromLayout(layoutItems, tabIndexes.dashboardTabIndexes);
    }
    if (tabs.length === 0) {
      tabs = buildTabsFromCanvas(_KDB);
    }

    return {
      helperTabIds: helperTab.helperTabIds,
      helperTabPageId: helperTab.helperTabPageId,
      tabs: tabs
    };
  }

  // ---- sources -------------------------------------------------------------

  function readTabsConfig(_KDB, options) {
    if (options.tabsConfig) { return options.tabsConfig; }
    if (_KDB && _KDB.config && _KDB.config.tabs) { return _KDB.config.tabs; }
    return [];
  }

  function readTabsSnapshot(_KDB, options) {
    if (options.tabsSnapshot) { return options.tabsSnapshot; }
    if (typeof options.readTabsState === "function") { return options.readTabsState(_KDB); }
    return readTabsSnapshotFromApi(_KDB);
  }

  function readTabsSnapshotFromApi(_KDB) {
    const tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!tabsApi || typeof tabsApi.getState !== "function") { return undefined; }
    try {
      return tabsApi.getState();
    } catch (err) {
      console.error("[launchpad.buildLaunchpadTabs] tabs API read failed", err);
      return undefined;
    }
  }

  function readLayoutItems(_KDB, options) {
    if (options.layoutItems) {
      return Array.isArray(options.layoutItems) ? options.layoutItems : [];
    }
    const tabsFacet = readFacet(_KDB, "tabsFacet");
    if (!tabsFacet || typeof tabsFacet.listTabs !== "function") { return []; }
    try {
      const outcome = tabsFacet.listTabs();
      return outcome && outcome.ok === true && Array.isArray(outcome.data) ? layoutItemsFromTabs(outcome.data) : [];
    } catch (err) {
      console.error("[launchpad.buildLaunchpadTabs] Cognos layout read failed", err);
      return [];
    }
  }

  function layoutItemsFromTabs(descriptors) {
    const items = [];
    descriptors.forEach(function (descriptor) {
      const id = descriptor ? descriptor.id || descriptor.tabId || null : null;
      if (!id) { return; }
      const slot = Number.isFinite(Number(descriptor.index)) ? Number(descriptor.index) : items.length;
      items[slot] = { id: id, tabId: descriptor.tabId || id, pageId: descriptor.pageId || id };
    });
    return items;
  }

  function readFacet(_KDB, facetName) {
    const runtime = _KDB && _KDB.runtime ? _KDB.runtime.launchpad : null;
    return runtime && runtime[facetName] ? runtime[facetName] : null;
  }

  // ---- config tab indexes --------------------------------------------------
  // tabsConfig forms: array of entries, { tabs: [...] }, or an object keyed by tab index.

  function collectTabIndexes(tabsConfig) {
    const dashboardTabIndexes = [];
    const helperTabIndexes = [];
    const collect = function (tabConfig, fallbackIndex, isDefaultRoleDashboard) {
      const role = tabConfig && tabConfig.role;
      const tabIndex = readConfigTabIndex(tabConfig, fallbackIndex);
      if (role === "helper") {
        helperTabIndexes.push(tabIndex);
      } else if (role === "dashboard" || (isDefaultRoleDashboard && (role === "main" || role === undefined))) {
        dashboardTabIndexes.push(tabIndex);
      }
    };

    if (Array.isArray(tabsConfig)) {
      tabsConfig.forEach(function (tabConfig, index) { collect(tabConfig, index, true); });
    } else if (tabsConfig && Array.isArray(tabsConfig.tabs)) {
      tabsConfig.tabs.forEach(function (tabConfig, index) { collect(tabConfig, index, true); });
    } else if (tabsConfig && typeof tabsConfig === "object") {
      Object.keys(tabsConfig).forEach(function (key) { collect(tabsConfig[key], Number(key), false); });
    }

    return {
      dashboardTabIndexes: dashboardTabIndexes.sort(compareNumbers),
      helperTabIndexes: helperTabIndexes.sort(compareNumbers)
    };
  }

  function readConfigTabIndex(tabConfig, fallbackIndex) {
    const parsed = Number(tabConfig && (tabConfig.corTabIndex || tabConfig.index || tabConfig.order));
    return Number.isFinite(parsed) ? parsed : fallbackIndex;
  }

  function compareNumbers(left, right) {
    return left - right;
  }

  // ---- helper tab ----------------------------------------------------------

  function resolveHelperTab(tabsSnapshot, tabsConfig, helperTabIndexes) {
    const snapshotHelper = tabsSnapshot && tabsSnapshot.helperTab;
    const snapshotTabId = snapshotHelper ? snapshotHelper.tabId || snapshotHelper.id || null : null;
    if (snapshotTabId) {
      return { helperTabIds: [snapshotTabId], helperTabPageId: snapshotHelper.pageId || snapshotHelper.page || null };
    }

    const descriptors = helperTabIndexes.map(function (helperIndex) {
      return buildTabDescriptor(readConfigTabByIndex(tabsConfig, helperIndex), helperIndex);
    });
    return {
      helperTabIds: descriptors.map(function (descriptor) { return descriptor.tabId; }),
      helperTabPageId: descriptors.length > 0 ? descriptors[0].pageId : null
    };
  }

  // Array forms are read by array position; the object form is searched by corTabIndex or index.
  function readConfigTabByIndex(tabsConfig, helperIndex) {
    if (Array.isArray(tabsConfig)) { return tabsConfig[helperIndex] || {}; }
    if (tabsConfig && Array.isArray(tabsConfig.tabs)) { return tabsConfig.tabs[helperIndex] || {}; }
    const keys = tabsConfig && typeof tabsConfig === "object" ? Object.keys(tabsConfig) : [];
    for (let i = 0; i < keys.length; i += 1) {
      const tabConfig = tabsConfig[keys[i]] || {};
      if (Number(tabConfig.corTabIndex || tabConfig.index) === helperIndex) { return tabConfig; }
    }
    return {};
  }

  // ---- tabs ----------------------------------------------------------------

  function buildTabsFromState(tabsSnapshot, helperTabIds) {
    const snapshot = tabsSnapshot || {};
    const byIndex = snapshot.byIndex || {};
    const order = Array.isArray(snapshot.presentationOrder)
      ? snapshot.presentationOrder.slice()
      : Object.keys(byIndex).sort(compareNumbers);
    const tabs = [];

    order.forEach(function (key) {
      const tabState = byIndex[key] || {};
      if (helperTabIds.indexOf(tabState.tabId || tabState.id) === -1) {
        tabs.push(buildTabDescriptor(tabState, tabs.length));
      }
    });
    return tabs;
  }

  function buildTabsFromLayout(layoutItems, dashboardTabIndexes) {
    const tabs = [];
    dashboardTabIndexes.forEach(function (dashboardIndex) {
      const layoutIndex = Number(dashboardIndex);
      const layoutItem = Number.isFinite(layoutIndex) ? layoutItems[layoutIndex] : undefined;
      const tabId = layoutItem ? readLayoutItemTabId(layoutItem) : null;
      if (!tabId) { return; }
      const descriptor = buildTabDescriptor({ corTabIndex: layoutIndex, childIndex: layoutIndex, tabId: tabId }, layoutIndex);
      descriptor.childIndex = tabs.length;
      tabs.push(descriptor);
    });
    return tabs;
  }

  function readLayoutItemTabId(layoutItem) {
    if (layoutItem.id) { return layoutItem.id; }
    return Array.isArray(layoutItem.items) && layoutItem.items[0] && layoutItem.items[0].id ? layoutItem.items[0].id : null;
  }

  function buildTabsFromCanvas(_KDB) {
    const descriptors = readCanvasDescriptors(_KDB);
    const tabs = [];
    const seen = {};
    descriptors.forEach(function (descriptor) {
      const tabId = descriptor && descriptor.tabId ? descriptor.tabId : null;
      if (!tabId || seen[tabId]) { return; }
      seen[tabId] = true;
      tabs.push({ aliases: [tabId], childIndex: tabs.length, corTabIndex: tabs.length, pageId: tabId, tabId: tabId });
    });
    return tabs;
  }

  function readCanvasDescriptors(_KDB) {
    const canvasFacet = readFacet(_KDB, "canvasFacet");
    if (!canvasFacet || typeof canvasFacet.listCanvasWidgets !== "function") { return []; }
    try {
      const outcome = canvasFacet.listCanvasWidgets();
      return outcome && outcome.ok === true && Array.isArray(outcome.data) ? outcome.data : [];
    } catch (err) {
      console.error("[launchpad.buildLaunchpadTabs] Cognos canvas read failed", err);
      return [];
    }
  }

  // ---- descriptor ----------------------------------------------------------

  function buildTabDescriptor(_source, fallbackIndex) {
    const source = _source || {};
    const corTabIndex = readNumber(source.corTabIndex, readNumber(source.index, fallbackIndex));
    const childIndex = readNumber(source.childIndex, corTabIndex);
    const sourcePageId = readString(source.pageId, readString(source.page, null));
    const tabId = readString(source.tabId, readString(source.id, readString(sourcePageId, "tab-" + corTabIndex)));

    return { tabId: tabId, pageId: tabId, aliases: [tabId], corTabIndex: corTabIndex, childIndex: childIndex };
  }

  function readNumber(value, fallback) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) { return parsed; }
    return Number.isFinite(fallback) ? fallback : 0;
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }

  return buildLaunchpadTabs;
});
