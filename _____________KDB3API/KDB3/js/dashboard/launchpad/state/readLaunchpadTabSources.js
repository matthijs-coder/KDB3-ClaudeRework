define([], function () {
  function __controller(_KDB, _options) {
    try {
      const options = _options || {};
      return {
        tabsConfig: readTabsConfig(_KDB, options),
        tabsSnapshot: readTabsSnapshot(_KDB, options),
        layoutItems: readLayoutItems(_KDB, options)
      };
    } catch (err) {
      console.error("[launchpad.readLaunchpadTabSources] failed", err);
      throw err;
    }
  }

  function readTabsConfig(_KDB, options) {
    if (options.tabsConfig) {
      return options.tabsConfig;
    }

    if (_KDB && _KDB.config && _KDB.config.tabs) {
      return _KDB.config.tabs;
    }

    return [];
  }

  function readLayoutItems(_KDB, options) {
    try {
      if (options.layoutItems) {
        return Array.isArray(options.layoutItems) ? options.layoutItems : [];
      }

      const runtime = _KDB && _KDB.runtime ? _KDB.runtime.launchpad : null;
      const tabsFacet = runtime && runtime.tabsFacet ? runtime.tabsFacet : null;
      if (!tabsFacet || typeof tabsFacet.listTabs !== "function") {
        return [];
      }

      const outcome = tabsFacet.listTabs();
      if (!(outcome && outcome.ok === true && Array.isArray(outcome.data))) {
        return [];
      }

      return layoutItemsFromTabDescriptors(outcome.data);
    } catch (err) {
      console.error("[launchpad.buildLaunchpadTabDescriptors] Cognos layout read failed", err);
      return [];
    }
  }

  function layoutItemsFromTabDescriptors(descriptors) {
    const items = [];
    let index = 0;

    while (index < descriptors.length) {
      const descriptor = descriptors[index];
      index += 1;
      if (!descriptor) {
        continue;
      }

      const id = descriptor.id || descriptor.tabId || null;
      if (!id) {
        continue;
      }

      const slot = Number.isFinite(Number(descriptor.index)) ? Number(descriptor.index) : items.length;
      items[slot] = {
        id: id,
        tabId: descriptor.tabId || id,
        pageId: descriptor.pageId || id
      };
    }

    return items;
  }

  function readTabsSnapshot(_KDB, options) {
    if (options.tabsSnapshot) {
      return options.tabsSnapshot;
    }

    if (typeof options.readTabsState === "function") {
      return options.readTabsState(_KDB);
    }

    return readTabsSnapshotFromApi(_KDB);
  }

  function readTabsSnapshotFromApi(_KDB) {
    try {
      if (!_KDB || !_KDB.api || !_KDB.api.tabs) {
        return undefined;
      }

      if (typeof _KDB.api.tabs.getState !== "function") {
        return undefined;
      }

      return _KDB.api.tabs.getState();
    } catch (err) {
      console.error("[launchpad.buildLaunchpadTabDescriptors] tabs API read failed", err);
      return undefined;
    }
  }

  return __controller;
});
