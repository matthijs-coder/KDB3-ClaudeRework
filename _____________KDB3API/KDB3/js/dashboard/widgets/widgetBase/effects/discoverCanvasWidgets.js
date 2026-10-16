define([
  "./readCanvasDiscoverySources.js",
  "./buildCanvasWidgetDescriptor.js",
  "./waitForScopedShells.js",
  "./readCanvasFacet.js"
], function (_readCanvasDiscoverySources, _buildCanvasWidgetDescriptor, _waitForScopedShells, _readCanvasFacet) {
  // Tab-scoped passes (options.tabId set) first wait — bounded, see
  // waitForScopedShells.js — for the target tab container and for the DOM
  // shells of widgets attributable to that tab, so containment scoping and
  // routing operate on rendered shells (lazyLaunchpadRouting delta §3.4a).
  function discoverCanvasWidgets(_KDB, _options) {
    const options = Object.assign({}, _options);
    if (options.tabId) {
      options.otherTabAliases = _waitForScopedShells.readOtherTabAliases(_KDB, options.tabId);
    }
    return _waitForScopedShells.waitForTabContainer(_KDB, options.tabId).then(function () {
      const canvasItems = readCanvasDescriptors(_KDB);
      return _waitForScopedShells.waitForScopedShells(_KDB, canvasItems, options).then(function () {
        return collectDescriptors(_KDB, canvasItems, options);
      });
    });
  }

  function readCanvasDescriptors(_KDB) {
    const canvasFacet = _readCanvasFacet(_KDB);
    if (!canvasFacet || typeof canvasFacet.listCanvasWidgets !== "function") {
      return [];
    }
    try {
      const outcome = canvasFacet.listCanvasWidgets();
      if (outcome && outcome.ok === true && Array.isArray(outcome.data)) {
        return outcome.data;
      }
    } catch (err) {
      console.error("[widgetBase.discoverCanvasWidgets] listCanvasWidgets failed", err);
    }
    return [];
  }

  function collectDescriptors(_KDB, canvasItems, options) {
    const descriptors = [];
    const helperTabIds = _readCanvasDiscoverySources.readHelperTabIds(_KDB);
    let index = 0;
    while (index < canvasItems.length) {
      const descriptor = _buildCanvasWidgetDescriptor(_KDB, canvasItems[index], helperTabIds, options, _readCanvasDiscoverySources);
      if (descriptor) {
        descriptors.push(descriptor);
      }
      index += 1;
    }
    return descriptors;
  }

  return discoverCanvasWidgets;
});
