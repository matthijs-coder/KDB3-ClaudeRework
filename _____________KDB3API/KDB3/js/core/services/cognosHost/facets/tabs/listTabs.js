define([
  "./resolveTabsHostApi.js",
  "./flattenTabDescriptor.js",
  "./buildTabsOutcome.js",
  "./config/tabsErrorCodes.js"
], function (
  _resolveTabsHostApi,
  _flattenTabDescriptor,
  _buildTabsOutcome,
  _tabsErrorCodes
) {
  "use strict";

  function isAborted(_input) {
    return !!(_input && _input.signal && _input.signal.aborted === true);
  }

  function normalizeLayoutItems(_value) {
    if (_value == null) {
      return [];
    }
    if (Array.isArray(_value)) {
      return _value;
    }
    return null;
  }

  function listNow(_ctx) {
    var tabsApi;
    var items;
    var descriptors;
    var index;
    var descriptor;
    tabsApi = _resolveTabsHostApi(_ctx._KDB);
    if (!tabsApi) {
      return _buildTabsOutcome.buildFailed(_tabsErrorCodes.HOST_UNAVAILABLE, []);
    }
    if (typeof tabsApi.getTabsContainers !== "function") {
      return _buildTabsOutcome.buildFailed(_tabsErrorCodes.HOST_CAPABILITY_MISSING, []);
    }
    items = normalizeLayoutItems(tabsApi.getTabsContainers());
    if (!items) {
      return _buildTabsOutcome.buildFailed(_tabsErrorCodes.INVENTORY_FAILED, []);
    }
    descriptors = [];
    for (index = 0; index < items.length; index += 1) {
      descriptor = _flattenTabDescriptor(items[index], index);
      if (descriptor) {
        descriptors.push(descriptor);
      }
    }
    return _buildTabsOutcome.buildOk(descriptors);
  }

  function __controller(_ctx, _input) {
    if (_ctx.isDisposed()) {
      return _buildTabsOutcome.buildDisposed();
    }
    if (isAborted(_input)) {
      return _buildTabsOutcome.buildAborted("aborted");
    }
    try {
      return listNow(_ctx);
    } catch (error) {
      console.error("[cognosHost.tabs.listTabs] failed", error);
      return _buildTabsOutcome.buildFailed(_tabsErrorCodes.INVENTORY_FAILED, [
        _buildTabsOutcome.buildDiagnostic(
          _tabsErrorCodes.INVENTORY_FAILED,
          error && error.message ? error.message : String(error)
        )
      ]);
    }
  }

  return __controller;
});
