define([], function () {
  function __controller(_KDB) {
    const descriptors = readCanvasDescriptors(_KDB);
    return buildTabsFromDescriptors(descriptors);
  }

  function readCanvasDescriptors(_KDB) {
    try {
      const runtime = _KDB && _KDB.runtime ? _KDB.runtime.launchpad : null;
      const canvasFacet = runtime && runtime.canvasFacet ? runtime.canvasFacet : null;
      if (!canvasFacet || typeof canvasFacet.listCanvasWidgets !== "function") {
        return [];
      }
      const outcome = canvasFacet.listCanvasWidgets();
      if (outcome && outcome.ok === true && Array.isArray(outcome.data)) {
        return outcome.data;
      }
      return [];
    } catch (err) {
      console.error("[launchpad.buildLaunchpadTabsFromCanvas] Cognos canvas read failed", err);
      return [];
    }
  }

  function buildTabsFromDescriptors(_descriptors) {
    const tabs = [];
    const seen = {};
    let index = 0;
    while (index < _descriptors.length) {
      appendCanvasTab(tabs, seen, _descriptors[index]);
      index += 1;
    }
    return tabs;
  }

  function appendCanvasTab(tabs, seen, descriptor) {
    const tabId = descriptor && descriptor.tabId ? descriptor.tabId : null;
    if (!tabId || seen[tabId]) {
      return;
    }
    seen[tabId] = true;
    tabs.push({
      aliases: [tabId],
      childIndex: tabs.length,
      corTabIndex: tabs.length,
      pageId: tabId,
      tabId: tabId
    });
  }

  return __controller;
});
