define([
  "./resolveTabsHostApi.js",
  "./buildTabsOutcome.js",
  "./config/tabsErrorCodes.js"
], function (_resolveTabsHostApi, _buildTabsOutcome, _tabsErrorCodes) {
  "use strict";

  function resolveTabRefId(_tabRef) {
    if (_tabRef == null) {
      return null;
    }
    if (typeof _tabRef === "string") {
      return _tabRef !== "" ? _tabRef : null;
    }
    if (typeof _tabRef !== "object") {
      return null;
    }
    if (_tabRef.tabId != null && _tabRef.tabId !== "") {
      return String(_tabRef.tabId);
    }
    if (_tabRef.pageId != null && _tabRef.pageId !== "") {
      return String(_tabRef.pageId);
    }
    if (_tabRef.id != null && _tabRef.id !== "") {
      return String(_tabRef.id);
    }
    return null;
  }

  function flattenTabName(_value) {
    if (typeof _value === "string") {
      return _value;
    }
    if (_value == null) {
      return "";
    }
    if (typeof _value === "number" || typeof _value === "boolean") {
      return String(_value);
    }
    if (typeof _value === "object" && typeof _value.then === "function") {
      return null;
    }
    if (typeof _value === "object") {
      if (typeof _value.text === "string") {
        return _value.text;
      }
      if (typeof _value.value === "string") {
        return _value.value;
      }
      if (typeof _value.label === "string") {
        return _value.label;
      }
      if (typeof _value.title === "string") {
        return _value.title;
      }
    }
    return "";
  }

  function __controller(_ctx, _tabRef) {
    var tabsApi;
    var tabId;
    var name;
    if (_ctx.isDisposed()) {
      return _buildTabsOutcome.buildDisposed();
    }
    tabId = resolveTabRefId(_tabRef);
    if (!tabId) {
      return _buildTabsOutcome.buildFailed(_tabsErrorCodes.INVALID_ID, []);
    }
    try {
      tabsApi = _resolveTabsHostApi(_ctx._KDB);
      if (!tabsApi) {
        return _buildTabsOutcome.buildFailed(_tabsErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof tabsApi.getTabName !== "function") {
        return _buildTabsOutcome.buildFailed(_tabsErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      name = flattenTabName(tabsApi.getTabName(tabId));
      if (name == null) {
        return _buildTabsOutcome.buildFailed(_tabsErrorCodes.READ_FAILED, [
          _buildTabsOutcome.buildDiagnostic(_tabsErrorCodes.READ_FAILED, "host promise")
        ]);
      }
      return _buildTabsOutcome.buildOk(name);
    } catch (error) {
      console.error("[cognosHost.tabs.getTabName] failed", { tabId: tabId }, error);
      return _buildTabsOutcome.buildFailed(_tabsErrorCodes.READ_FAILED, [
        _buildTabsOutcome.buildDiagnostic(
          _tabsErrorCodes.READ_FAILED,
          error && error.message ? error.message : String(error)
        )
      ]);
    }
  }

  return __controller;
});
